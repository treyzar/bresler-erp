"""Тесты параллельных веток согласования (AND / OR + смешанные цепочки)."""

from __future__ import annotations

import pytest
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


# ============== fixtures ==============


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept = Department.add_root(name="Отдел", unit_type="department", company=company)
    return {"company": company, "dept": dept}


@pytest.fixture
def author(org):
    return UserFactory(
        last_name="Иванов",
        company_unit=org["company"], department_unit=org["dept"],
    )


@pytest.fixture
def supervisor(org):
    return UserFactory(
        last_name="Петров",
        company_unit=org["company"], department_unit=org["dept"],
        is_department_head=True,
    )


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


@pytest.fixture
def legal_group(db):
    g, _ = Group.objects.get_or_create(name="legal")
    return g


@pytest.fixture
def doc_type_factory(db):
    """Фабрика DocumentType с любой цепочкой шагов."""
    counter = {"n": 0}

    def make(steps):
        counter["n"] += 1
        n = counter["n"]
        seq = NumberSequence.objects.create(name=f"par-{n}", prefix="P", pattern="{prefix}-{####}")
        chain = ApprovalChainTemplate.objects.create(name=f"par-{n}", steps=steps)
        return DocumentType.objects.create(
            code=f"par_type_{n}", name=f"Parallel {n}", category="memo",
            field_schema=[{"name": "subject", "type": "text"}],
            title_template="{{ subject }}", body_template="{{ subject }}",
            default_chain=chain, numbering_sequence=seq,
        )

    return make


# ============== submit/activation ==============


@pytest.mark.django_db
def test_submit_marks_only_first_batch_pending(
    doc_type_factory, author, supervisor, org, accounting_group,
):
    """При submit'е первый шаг — PENDING, остальные — WAITING."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    steps = list(doc.steps.order_by("order"))
    assert steps[0].status == ApprovalStep.Status.PENDING
    assert steps[1].status == ApprovalStep.Status.WAITING


@pytest.mark.django_db
def test_inform_step_before_active_auto_completes_at_activation(
    doc_type_factory, author, supervisor, org, accounting_group,
):
    """inform-шаг между active-шагами автоматически закрывается при активации следующего batch'а."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "inform"},
        {"order": 3, "role_key": "fixed_user:" + str(supervisor.pk), "label": "Финал", "action": "approve"},
    ])
    # Удаляем dedupe-кollision: supervisor встречается дважды; second step
    # дедупится только если parallel_group пуст. Используем разных людей.
    director = UserFactory(last_name="Директор", company_unit=org["company"], is_department_head=True)
    dtype.default_chain.steps[2]["role_key"] = f"fixed_user:{director.pk}"
    dtype.default_chain.save()

    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    svc.approve(doc, supervisor, comment="ok")
    doc.refresh_from_db()
    inform_step = doc.steps.get(action="inform")
    assert inform_step.status == ApprovalStep.Status.APPROVED
    # next active step активирован
    final_step = doc.steps.get(role_key__startswith="fixed_user:")
    assert final_step.status == ApprovalStep.Status.PENDING


# ============== AND mode ==============


@pytest.mark.django_db
def test_parallel_and_requires_all_approvers(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    """AND: пока не одобрили все участники batch'а, документ не идёт дальше."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юрист", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    # Оба шага должны стать PENDING сразу.
    pending = doc.steps.filter(status=ApprovalStep.Status.PENDING)
    assert pending.count() == 2

    # Первый approve не закрывает документ.
    svc.approve(doc, accountant, comment="бух ок")
    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING
    assert doc.steps.filter(status=ApprovalStep.Status.PENDING).count() == 1

    # Второй approve закрывает.
    svc.approve(doc, lawyer, comment="юр ок")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_parallel_and_one_reject_kills_document(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    svc.reject(doc, lawyer, comment="нельзя")
    doc.refresh_from_db()
    assert doc.status == Document.Status.REJECTED


# ============== OR mode ==============


@pytest.mark.django_db
def test_parallel_or_one_approve_advances(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    """OR: первый approve в batch'е → остальные SKIPPED, документ идёт дальше."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    svc.approve(doc, accountant, comment="ок")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED

    # Юриста шаг должен быть SKIPPED.
    legal_step = doc.steps.get(role_label="Юр.")
    assert legal_step.status == ApprovalStep.Status.SKIPPED


@pytest.mark.django_db
def test_parallel_or_one_reject_does_not_kill_document(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    svc.reject(doc, lawyer, comment="нет")
    doc.refresh_from_db()
    # Документ всё ещё в работе — бухгалтер может одобрить.
    assert doc.status == Document.Status.PENDING

    svc.approve(doc, accountant, comment="ок")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_parallel_or_all_reject_kills_document(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "any_one", "parallel_mode": "or"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    svc.reject(doc, accountant, comment="нет 1")
    svc.reject(doc, lawyer, comment="нет 2")
    doc.refresh_from_db()
    assert doc.status == Document.Status.REJECTED


# ============== sequential ⇄ parallel ==============


@pytest.mark.django_db
def test_sequential_then_parallel_then_sequential(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    """Цепочка: руководитель → [бух || юр] (AND) → директор."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)
    director = UserFactory(
        last_name="Дир", company_unit=org["company"], is_department_head=True,
    )

    dtype = doc_type_factory([
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
        {"order": 3, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
        {"order": 4, "role_key": f"fixed_user:{director.pk}", "label": "Дир.", "action": "approve"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    # 1. Только supervisor в pending.
    assert doc.steps.filter(status=ApprovalStep.Status.PENDING).count() == 1
    svc.approve(doc, supervisor, comment="1")

    # 2. После supervisor — оба параллельных pending.
    doc.refresh_from_db()
    assert doc.steps.filter(status=ApprovalStep.Status.PENDING).count() == 2

    svc.approve(doc, accountant, comment="2a")
    svc.approve(doc, lawyer, comment="2b")

    # 3. Параллельный batch закрылся — директор pending.
    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING
    assert doc.current_step.role_label == "Дир."

    svc.approve(doc, director, comment="3")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


# ============== inbox_for со средой parallel ==============


@pytest.mark.django_db
def test_inbox_for_includes_all_pending_in_parallel_batch(
    doc_type_factory, author, supervisor, org, accounting_group, legal_group,
):
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)
    lawyer = UserFactory(last_name="Юр", company_unit=org["company"])
    lawyer.groups.add(legal_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
        {"order": 2, "role_key": "group:legal@company", "label": "Юр.",
         "action": "approve", "parallel_group": "review", "parallel_mode": "and"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    # Оба видят документ в своём inbox'е, а не только тот, кого назначили
    # `current_step.approver`.
    assert doc in Document.objects.inbox_for(accountant)
    assert doc in Document.objects.inbox_for(lawyer)


@pytest.mark.django_db
def test_inbox_for_excludes_waiting_steps(
    doc_type_factory, author, supervisor, org, accounting_group,
):
    """Сотрудник назначенный на 2-й (sequential) шаг не должен видеть документ
    в inbox'е, пока не дошла его очередь."""
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accounting_group)

    dtype = doc_type_factory([
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ])
    doc = svc.create_draft(author=author, doc_type=dtype, field_values={"subject": "x"})
    svc.submit(doc, author)

    # Ещё не дошла очередь до бухгалтера.
    assert doc not in Document.objects.inbox_for(accountant)
    # А когда супервайзер одобрит — должен появиться.
    svc.approve(doc, supervisor, comment="1")
    assert doc in Document.objects.inbox_for(accountant)
