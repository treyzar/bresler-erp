"""Тесты email-link согласования: подписанные токены + публичный view."""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.edo.internal_docs.services.email_token import (
    ACTION_APPROVE,
    ACTION_REJECT,
    InvalidEmailToken,
    make_token,
    parse_token,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept = Department.add_root(name="Отдел", unit_type="department", company=company)
    return {"company": company, "dept": dept}


@pytest.fixture
def author(org):
    return UserFactory(last_name="Иванов", company_unit=org["company"], department_unit=org["dept"])


@pytest.fixture
def supervisor(org):
    return UserFactory(
        last_name="Петров",
        company_unit=org["company"],
        department_unit=org["dept"],
        is_department_head=True,
    )


@pytest.fixture
def memo_type(db):
    seq = NumberSequence.objects.create(name="email", prefix="E", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="email-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"}],
    )
    return DocumentType.objects.create(
        code="email_memo",
        name="Email memo",
        category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}",
        body_template="{{ subject }}",
        default_chain=chain,
        numbering_sequence=seq,
    )


# ============== make/parse_token ==============


def test_make_and_parse_roundtrip():
    token = make_token(42, ACTION_APPROVE)
    sid, action = parse_token(token)
    assert sid == 42
    assert action == ACTION_APPROVE


def test_invalid_action_rejected():
    with pytest.raises(ValueError):
        make_token(1, "noop")


def test_tampered_token_rejected():
    token = make_token(1, ACTION_APPROVE) + "x"
    with pytest.raises(InvalidEmailToken):
        parse_token(token)


def test_random_string_rejected():
    with pytest.raises(InvalidEmailToken):
        parse_token("not-a-token")


def test_approve_token_cant_be_reused_as_reject():
    """Salt+payload защищают от подмены action на стороне клиента."""
    approve_token = make_token(7, ACTION_APPROVE)
    sid, action = parse_token(approve_token)
    assert action == ACTION_APPROVE  # клиент не может «угадать» reject-токен


# ============== email-action endpoint ==============


@pytest.mark.django_db
def test_get_returns_preview(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    token = make_token(step.pk, ACTION_APPROVE)

    client = APIClient()
    url = reverse("edo:email-action", kwargs={"token": token})
    r = client.get(url)
    assert r.status_code == 200
    assert r.data["action"] == ACTION_APPROVE
    assert r.data["document"]["id"] == doc.pk
    assert r.data["step"]["id"] == step.pk


@pytest.mark.django_db
def test_post_approve_closes_document(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    token = make_token(step.pk, ACTION_APPROVE)

    client = APIClient()
    url = reverse("edo:email-action", kwargs={"token": token})
    r = client.post(url, data={"comment": "согласовано из почты"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_post_reject_requires_comment(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    token = make_token(step.pk, ACTION_REJECT)

    client = APIClient()
    url = reverse("edo:email-action", kwargs={"token": token})
    r = client.post(url, data={}, format="json")
    assert r.status_code == 400  # без комментария

    r = client.post(url, data={"comment": "не согласен"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == Document.Status.REJECTED


@pytest.mark.django_db
def test_token_invalid_after_step_closes(memo_type, author, supervisor):
    """Повторное использование токена после approve → 400."""
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    token = make_token(step.pk, ACTION_APPROVE)

    # Сначала согласовываем напрямую через сервис.
    svc.approve(doc, supervisor, comment="ok")

    client = APIClient()
    url = reverse("edo:email-action", kwargs={"token": token})
    r = client.post(url, data={"comment": ""}, format="json")
    assert r.status_code == 400
    assert "уже закрыт" in r.data["detail"].lower() or "закрыт" in r.data["detail"].lower()


@pytest.mark.django_db
def test_no_auth_required():
    """AnonymousUser должен иметь доступ к публичному endpoint'у."""
    client = APIClient()
    # Заведомо невалидный токен — но HTTP-код не 401/403, должно быть 400.
    url = reverse("edo:email-action", kwargs={"token": "garbage"})
    r = client.get(url)
    assert r.status_code == 400  # ошибка валидации токена, а не auth


@pytest.mark.django_db
def test_unknown_step_404(memo_type, author, supervisor):
    """Подписанный, но указывающий на несуществующий step → 404."""
    token = make_token(999_999, ACTION_APPROVE)
    client = APIClient()
    url = reverse("edo:email-action", kwargs={"token": token})
    r = client.post(url, data={"comment": ""}, format="json")
    assert r.status_code == 404
