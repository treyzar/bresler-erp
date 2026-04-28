"""Тесты массовых операций admin'а: bulk-cancel + bulk-remind."""

from __future__ import annotations

import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
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
def admin_user(db):
    g, _ = Group.objects.get_or_create(name="admin")
    u = UserFactory(last_name="Адм")
    u.groups.add(g)
    return u


@pytest.fixture
def memo_type(db):
    seq = NumberSequence.objects.create(name="bulk", prefix="B", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="bulk-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"}],
    )
    return DocumentType.objects.create(
        code="bulk_memo",
        name="Bulk memo",
        category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}",
        body_template="{{ subject }}",
        default_chain=chain,
        numbering_sequence=seq,
    )


def _make_pending_doc(memo_type, author, idx):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": f"x{idx}"})
    svc.submit(doc, author)
    return doc


# ============== force_cancel ==============


@pytest.mark.django_db
def test_force_cancel_after_first_approve(memo_type, author, supervisor, admin_user, org):
    """force_cancel должен работать даже когда обычный cancel не разрешён —
    после первого одобрения."""
    accountant_group, _ = Group.objects.get_or_create(name="accounting")
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accountant_group)

    memo_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    memo_type.default_chain.save()

    doc = _make_pending_doc(memo_type, author, 1)
    svc.approve(doc, supervisor, comment="ok")
    doc.refresh_from_db()
    assert doc.status == Document.Status.PENDING

    svc.force_cancel(doc, admin_user, reason="дубликат")
    doc.refresh_from_db()
    assert doc.status == Document.Status.CANCELLED


@pytest.mark.django_db
def test_force_cancel_requires_reason(memo_type, author, supervisor, admin_user):
    from django.core.exceptions import ValidationError

    doc = _make_pending_doc(memo_type, author, 1)
    with pytest.raises(ValidationError):
        svc.force_cancel(doc, admin_user, reason="")


@pytest.mark.django_db
def test_force_cancel_idempotent_on_closed(memo_type, author, supervisor, admin_user):
    """Уже закрытые документы не отменяются повторно."""
    doc = _make_pending_doc(memo_type, author, 1)
    svc.approve(doc, supervisor, comment="ok")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED

    with pytest.raises(svc.DocumentServiceError):
        svc.force_cancel(doc, admin_user, reason="нет")


# ============== /admin/bulk-cancel/ ==============


@pytest.mark.django_db
def test_bulk_cancel_endpoint_admin_only(memo_type, author, supervisor):
    doc = _make_pending_doc(memo_type, author, 1)
    client = APIClient()
    client.force_authenticate(author)
    r = client.post("/api/edo/internal/admin/bulk-cancel/", {"document_ids": [doc.pk], "reason": "test"}, format="json")
    assert r.status_code == 403


@pytest.mark.django_db
def test_bulk_cancel_endpoint_works(memo_type, author, supervisor, admin_user):
    docs = [_make_pending_doc(memo_type, author, i) for i in range(3)]
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.post(
        "/api/edo/internal/admin/bulk-cancel/",
        {"document_ids": [d.pk for d in docs], "reason": "массовая чистка"},
        format="json",
    )
    assert r.status_code == 200
    assert set(r.data["cancelled"]) == {d.pk for d in docs}
    for d in docs:
        d.refresh_from_db()
        assert d.status == Document.Status.CANCELLED


@pytest.mark.django_db
def test_bulk_cancel_reports_skipped_for_closed(memo_type, author, supervisor, admin_user):
    """Документы в финальном статусе должны попасть в `skipped`, а не в `errors`."""
    closed_doc = _make_pending_doc(memo_type, author, 1)
    svc.approve(closed_doc, supervisor, comment="ok")
    open_doc = _make_pending_doc(memo_type, author, 2)

    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.post(
        "/api/edo/internal/admin/bulk-cancel/",
        {"document_ids": [closed_doc.pk, open_doc.pk], "reason": "test"},
        format="json",
    )
    assert r.status_code == 200
    assert open_doc.pk in r.data["cancelled"]
    skipped_ids = [s["id"] for s in r.data["skipped"]]
    assert closed_doc.pk in skipped_ids


@pytest.mark.django_db
def test_bulk_cancel_validates_payload(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.post("/api/edo/internal/admin/bulk-cancel/", {"document_ids": [], "reason": "x"}, format="json")
    assert r.status_code == 400
    r = client.post("/api/edo/internal/admin/bulk-cancel/", {"document_ids": [1], "reason": ""}, format="json")
    assert r.status_code == 400


# ============== /admin/bulk-remind/ ==============


@pytest.mark.django_db
def test_bulk_remind_sends_to_active_approvers(memo_type, author, supervisor, admin_user):
    doc = _make_pending_doc(memo_type, author, 1)
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.post(
        "/api/edo/internal/admin/bulk-remind/",
        {"document_ids": [doc.pk], "message": "пожалуйста, посмотрите"},
        format="json",
    )
    assert r.status_code == 200
    assert doc.pk in r.data["reminded"]

    from apps.notifications.models import Notification

    notifs = Notification.objects.filter(recipient=supervisor)
    assert any("Напоминание" in n.title for n in notifs)


@pytest.mark.django_db
def test_bulk_remind_skips_closed(memo_type, author, supervisor, admin_user):
    doc = _make_pending_doc(memo_type, author, 1)
    svc.approve(doc, supervisor, comment="ok")
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.post("/api/edo/internal/admin/bulk-remind/", {"document_ids": [doc.pk]}, format="json")
    assert r.status_code == 200
    assert r.data["reminded"] == []
    assert any(s["id"] == doc.pk for s in r.data["skipped"])
