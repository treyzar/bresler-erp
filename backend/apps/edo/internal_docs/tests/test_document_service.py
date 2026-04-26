"""Тесты жизненного цикла документа: create → submit → approve/reject/etc."""

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth.models import Group

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    ApprovalStep,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept1 = Department.add_root(name="Отдел 1", unit_type="department", company=company)
    sector = dept1.add_child(name="Сектор А", unit_type="sector", company=company)
    return {"company": company, "dept1": dept1, "sector": sector}


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


@pytest.fixture
def memo_type(db, org):
    seq = NumberSequence.objects.create(
        name="test-memo", prefix="СЗ", pattern="{prefix}-{YYYY}-{####}",
    )
    chain = ApprovalChainTemplate.objects.create(
        name="Простая цепочка",
        steps=[
            {"order": 1, "role_key": "supervisor", "label": "Руководитель",
             "action": "approve", "sla_hours": 24},
        ],
    )
    return DocumentType.objects.create(
        code="test_memo",
        name="Test Memo",
        category="memo",
        field_schema=[{"name": "subject", "type": "text", "required": True}],
        title_template="Служебка «{{ subject }}»",
        body_template="{{ subject }}\n\nПодробности от {{ author.last_name }}",
        numbering_sequence=seq,
        default_chain=chain,
    )


@pytest.fixture
def author(db, org):
    u = UserFactory(
        last_name="Иванов", first_name="И", patronymic="И",
        company_unit=org["company"], department_unit=org["sector"],
    )
    return u


@pytest.fixture
def supervisor(db, org):
    return UserFactory(
        last_name="Петров", first_name="П", patronymic="П",
        company_unit=org["company"], department_unit=org["sector"],
        is_department_head=True,
    )


# ---------- create_draft / update_draft ----------

@pytest.mark.django_db
def test_create_draft(memo_type, author):
    doc = svc.create_draft(
        author=author, doc_type=memo_type,
        field_values={"subject": "Привет"}, title="",
    )
    assert doc.status == Document.Status.DRAFT
    assert doc.pk is not None
    assert doc.number == ""  # номер присваивается только на submit


@pytest.mark.django_db
def test_update_draft(memo_type, author):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "A"})
    svc.update_draft(doc, field_values={"subject": "B"}, title="Новое")
    doc.refresh_from_db()
    assert doc.field_values == {"subject": "B"}
    assert doc.title == "Новое"


@pytest.mark.django_db
def test_update_draft_preserves_addressee(memo_type, author):
    """addressee не сбрасывается, если его не передали в update_draft."""
    addressee = UserFactory(last_name="Адресатов")
    doc = svc.create_draft(
        author=author, doc_type=memo_type,
        field_values={"subject": "A"}, addressee=addressee,
    )
    svc.update_draft(doc, title="Новое")
    doc.refresh_from_db()
    assert doc.addressee_id == addressee.pk


@pytest.mark.django_db
def test_update_draft_can_clear_addressee(memo_type, author):
    """Явная передача addressee=None очищает поле."""
    addressee = UserFactory(last_name="Адресатов")
    doc = svc.create_draft(
        author=author, doc_type=memo_type,
        field_values={"subject": "A"}, addressee=addressee,
    )
    svc.update_draft(doc, addressee=None)
    doc.refresh_from_db()
    assert doc.addressee_id is None


@pytest.mark.django_db
def test_cannot_update_non_draft(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "A"})
    svc.submit(doc, author)
    with pytest.raises(svc.DocumentServiceError):
        svc.update_draft(doc, field_values={"subject": "B"})


# ---------- submit ----------

@pytest.mark.django_db
def test_submit_happy_path(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "Тест"})
    svc.submit(doc, author)

    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING
    assert doc.number.startswith("СЗ-")
    assert doc.title == "Служебка «Тест»"
    assert "Иванов" in doc.body_rendered
    assert len(doc.chain_snapshot) == 1
    assert doc.author_company_unit_id == author.company_unit_id
    assert doc.author_department_unit_id == author.department_unit_id
    assert doc.submitted_at is not None

    steps = list(doc.steps.all())
    assert len(steps) == 1
    assert steps[0].approver_id == supervisor.pk
    assert steps[0].status == ApprovalStep.Status.PENDING
    assert steps[0].sla_due_at is not None
    assert doc.current_step_id == steps[0].pk


@pytest.mark.django_db
def test_submit_not_author_forbidden(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    other = UserFactory()
    with pytest.raises(PermissionDenied):
        svc.submit(doc, other)


@pytest.mark.django_db
def test_submit_without_supervisor_fails(memo_type, author):
    """У автора нет руководителя → supervisor не резолвится → DocumentServiceError."""
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    # supervisor fixture не создан — нет head в dept.
    with pytest.raises(svc.DocumentServiceError):
        svc.submit(doc, author)


@pytest.mark.django_db
def test_resubmit_after_revision(memo_type, author, supervisor):
    """После revision_requested автор снова submit'ит — получает новые шаги."""
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.request_revision(doc, supervisor, comment="Переделать")
    doc.refresh_from_db()
    assert doc.status == Document.Status.REVISION_REQUESTED

    # Автор правит и отправляет снова.
    svc.update_draft(doc, field_values={"subject": "y"})
    svc.submit(doc, author)
    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING
    assert doc.steps.count() == 1  # старые шаги удалены


# ---------- approve ----------

@pytest.mark.django_db
def test_approve_single_step_closes_document(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    svc.approve(doc, supervisor, comment="ok")
    doc.refresh_from_db()
    step.refresh_from_db()
    assert step.status == ApprovalStep.Status.APPROVED
    assert step.comment == "ok"
    assert doc.status == Document.Status.APPROVED
    assert doc.closed_at is not None
    assert doc.current_step is None


@pytest.mark.django_db
def test_approve_advances_to_next_step(memo_type, author, supervisor, org, accounting_group):
    """Цепочка из двух active-шагов. После первого approve current_step переходит."""
    accountant = UserFactory(last_name="Бухгалтерова", company_unit=org["company"])
    accountant.groups.add(accounting_group)

    memo_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    memo_type.default_chain.save()

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.approve(doc, supervisor, comment="1")
    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING
    assert doc.current_step.approver_id == accountant.pk

    svc.approve(doc, accountant, comment="2")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_non_approver_cannot_approve(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    other = UserFactory()
    with pytest.raises(PermissionDenied):
        svc.approve(doc, other, comment="")


@pytest.mark.django_db
def test_inform_step_auto_completed(memo_type, author, supervisor, org, accounting_group):
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    memo_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "inform"},
    ]
    memo_type.default_chain.save()

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.approve(doc, supervisor, comment="")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED
    inform_step = doc.steps.get(action="inform")
    assert inform_step.status == ApprovalStep.Status.APPROVED


# ---------- reject / request_revision ----------

@pytest.mark.django_db
def test_reject_closes_document(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.reject(doc, supervisor, comment="Не годится")
    doc.refresh_from_db()
    assert doc.status == Document.Status.REJECTED
    assert doc.closed_at is not None


@pytest.mark.django_db
def test_reject_requires_comment(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    with pytest.raises(ValidationError):
        svc.reject(doc, supervisor, comment="")


@pytest.mark.django_db
def test_request_revision_sends_back_to_author(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.request_revision(doc, supervisor, comment="Поправьте")
    doc.refresh_from_db()
    assert doc.status == Document.Status.REVISION_REQUESTED
    assert doc.current_step is None


# ---------- delegate ----------

@pytest.mark.django_db
def test_delegate(memo_type, author, supervisor, org):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    delegate_to = UserFactory(last_name="Замена")

    svc.delegate(step, supervisor, delegate_to)
    step.refresh_from_db()
    assert step.approver_id == delegate_to.pk
    assert step.original_approver_id == supervisor.pk
    assert step.status == ApprovalStep.Status.PENDING


@pytest.mark.django_db
def test_delegate_wrong_user_forbidden(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    other = UserFactory()
    target = UserFactory()
    with pytest.raises(PermissionDenied):
        svc.delegate(step, other, target)


@pytest.mark.django_db
def test_cannot_delegate_to_self(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    with pytest.raises(ValidationError):
        svc.delegate(doc.current_step, supervisor, supervisor)


# ---------- cancel ----------

@pytest.mark.django_db
def test_cancel_draft(memo_type, author):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.cancel(doc, author)
    doc.refresh_from_db()
    assert doc.status == Document.Status.CANCELLED


@pytest.mark.django_db
def test_cancel_pending_before_first_approve(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.cancel(doc, author)
    doc.refresh_from_db()
    assert doc.status == Document.Status.CANCELLED
    # все pending-шаги → skipped
    assert not doc.steps.filter(status=ApprovalStep.Status.PENDING).exists()


@pytest.mark.django_db
def test_cannot_cancel_after_approve(memo_type, author, supervisor, org, accounting_group):
    accountant = UserFactory(last_name="Б", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    memo_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    memo_type.default_chain.save()
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    svc.approve(doc, supervisor, comment="")

    with pytest.raises(svc.DocumentServiceError):
        svc.cancel(doc, author)


@pytest.mark.django_db
def test_non_author_cannot_cancel(memo_type, author):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    other = UserFactory()
    with pytest.raises(PermissionDenied):
        svc.cancel(doc, other)
