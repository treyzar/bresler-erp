"""Тесты отчётов: services.reports + admin API endpoints."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    ApprovalStep,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.edo.internal_docs.services.reports import (
    sla_breaches,
    stuck_documents,
    top_by_type,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept = Department.add_root(name="Отдел", unit_type="department", company=company)
    return {"company": company, "dept": dept}


@pytest.fixture
def author(org):
    return UserFactory(
        last_name="Иванов",
        company_unit=org["company"],
        department_unit=org["dept"],
    )


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
    seq = NumberSequence.objects.create(name="rep", prefix="R", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="rep-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve", "sla_hours": 24}],
    )
    return DocumentType.objects.create(
        code="rep_memo",
        name="Report memo",
        category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}",
        body_template="{{ subject }}",
        default_chain=chain,
        numbering_sequence=seq,
    )


@pytest.fixture
def admin_user(db):
    g, _ = Group.objects.get_or_create(name="admin")
    u = UserFactory(last_name="Адм")
    u.groups.add(g)
    return u


# ============== stuck_documents ==============


@pytest.mark.django_db
def test_stuck_documents_empty(memo_type, author, supervisor):
    assert stuck_documents(min_pending_days=3) == []


@pytest.mark.django_db
def test_stuck_documents_finds_old_pending(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    # Назад во времени.
    Document.objects.filter(pk=doc.pk).update(submitted_at=timezone.now() - timedelta(days=5))

    rows = stuck_documents(min_pending_days=3)
    assert len(rows) == 1
    assert rows[0]["id"] == doc.pk
    assert rows[0]["days_pending"] >= 5


@pytest.mark.django_db
def test_stuck_documents_skips_recent(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    # submitted_at сегодня (только что) → не stuck.
    assert stuck_documents(min_pending_days=3) == []


# ============== sla_breaches ==============


@pytest.mark.django_db
def test_sla_breaches_finds_marked(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    ApprovalStep.objects.filter(pk=step.pk).update(sla_breached_at=timezone.now())

    rows = sla_breaches(period_days=30)
    assert len(rows) == 1
    assert rows[0]["step_id"] == step.pk


@pytest.mark.django_db
def test_sla_breaches_empty(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    assert sla_breaches(period_days=30) == []


# ============== top_by_type ==============


@pytest.mark.django_db
def test_top_by_type_aggregates(memo_type, author, supervisor):
    for _ in range(3):
        svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    rows = top_by_type(period_days=30)
    assert len(rows) == 1
    assert rows[0]["type_code"] == "rep_memo"
    assert rows[0]["total"] == 3
    assert rows[0]["pending"] == 0


# ============== API ==============


@pytest.mark.django_db
def test_report_endpoint_admin_only(memo_type, author):
    client = APIClient()
    client.force_authenticate(author)
    r = client.get("/api/edo/internal/admin/reports/stuck-documents/")
    assert r.status_code == 403


@pytest.mark.django_db
def test_report_endpoint_admin_ok(memo_type, author, supervisor, admin_user):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    Document.objects.filter(pk=doc.pk).update(submitted_at=timezone.now() - timedelta(days=5))

    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.get("/api/edo/internal/admin/reports/stuck-documents/?days=3")
    assert r.status_code == 200
    assert r.data["min_pending_days"] == 3
    assert any(row["id"] == doc.pk for row in r.data["results"])
