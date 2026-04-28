"""Тесты замещения: User.substitute_user + автоматический redirect approver'а
при активации шага.

Бизнес-правило: если у approver'а активен substitute_user (today ∈
[substitute_from, substitute_until]) на момент активации batch'а, шаг
автоматически перенаправляется на замещающего. Оригинал фиксируется в
`original_approver` — для аудита и возможной обратной перерезолвки."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
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
    seq = NumberSequence.objects.create(name="sub", prefix="S", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="sub-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"}],
    )
    return DocumentType.objects.create(
        code="sub_memo",
        name="Substitute test",
        category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}",
        body_template="{{ subject }}",
        default_chain=chain,
        numbering_sequence=seq,
    )


# ============== get_active_substitute() ==============


@pytest.mark.django_db
def test_no_substitute_returns_none(supervisor):
    assert supervisor.get_active_substitute() is None


@pytest.mark.django_db
def test_active_window_returns_substitute(supervisor):
    deputy = UserFactory(last_name="Зам")
    today = date.today()
    supervisor.substitute_user = deputy
    supervisor.substitute_from = today - timedelta(days=1)
    supervisor.substitute_until = today + timedelta(days=1)
    supervisor.save()
    assert supervisor.get_active_substitute() == deputy


@pytest.mark.django_db
def test_before_window_returns_none(supervisor):
    deputy = UserFactory(last_name="Зам")
    today = date.today()
    supervisor.substitute_user = deputy
    supervisor.substitute_from = today + timedelta(days=2)
    supervisor.substitute_until = today + timedelta(days=10)
    supervisor.save()
    assert supervisor.get_active_substitute() is None


@pytest.mark.django_db
def test_after_window_returns_none(supervisor):
    deputy = UserFactory(last_name="Зам")
    today = date.today()
    supervisor.substitute_user = deputy
    supervisor.substitute_from = today - timedelta(days=10)
    supervisor.substitute_until = today - timedelta(days=1)
    supervisor.save()
    assert supervisor.get_active_substitute() is None


@pytest.mark.django_db
def test_inactive_substitute_returns_none(supervisor):
    deputy = UserFactory(last_name="Зам", is_active=False)
    supervisor.substitute_user = deputy
    supervisor.save()
    assert supervisor.get_active_substitute() is None


@pytest.mark.django_db
def test_open_interval_no_dates(supervisor):
    """Если границы NULL — замещение бессрочное."""
    deputy = UserFactory(last_name="Зам")
    supervisor.substitute_user = deputy
    supervisor.save()
    assert supervisor.get_active_substitute() == deputy


# ============== интеграция с document_service ==============


@pytest.mark.django_db
def test_step_redirected_to_substitute_at_activation(memo_type, author, supervisor):
    """supervisor в отпуске → шаг идёт замещающему, original_approver фиксируется."""
    deputy = UserFactory(last_name="Зам", company_unit=author.company_unit)
    today = date.today()
    supervisor.substitute_user = deputy
    supervisor.substitute_from = today - timedelta(days=1)
    supervisor.substitute_until = today + timedelta(days=7)
    supervisor.save()

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    assert step.approver_id == deputy.pk
    assert step.original_approver_id == supervisor.pk

    # Замещающий может одобрить.
    svc.approve(doc, deputy, comment="ok")
    doc.refresh_from_db()
    from apps.edo.internal_docs.models import Document

    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_no_redirect_when_substitute_inactive(memo_type, author, supervisor):
    """Замещение с будущей датой — supervisor сам обрабатывает шаг."""
    deputy = UserFactory(last_name="Зам", company_unit=author.company_unit)
    today = date.today()
    supervisor.substitute_user = deputy
    supervisor.substitute_from = today + timedelta(days=10)
    supervisor.substitute_until = today + timedelta(days=20)
    supervisor.save()

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    assert step.approver_id == supervisor.pk
    assert step.original_approver_id is None
