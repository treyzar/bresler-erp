"""Тесты SLA-проверки: services.sla.mark_sla_breaches() + Celery task."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth.models import Group
from django.utils import timezone

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    ApprovalStep,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.edo.internal_docs.services.sla import mark_sla_breaches
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
        last_name="Петров", company_unit=org["company"], department_unit=org["dept"],
        is_department_head=True,
    )


@pytest.fixture
def memo_type(db):
    seq = NumberSequence.objects.create(name="sla", prefix="S", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="sla-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve",
                "sla_hours": 24}],
    )
    return DocumentType.objects.create(
        code="sla_memo", name="SLA memo", category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}", body_template="{{ subject }}",
        default_chain=chain, numbering_sequence=seq,
    )


def _backdate_sla(step: ApprovalStep, hours_ago: float):
    """Утилита: имитируем просрочку, выставляя sla_due_at в прошлое."""
    step.sla_due_at = timezone.now() - timedelta(hours=hours_ago)
    step.save(update_fields=["sla_due_at"])


@pytest.mark.django_db
def test_marks_overdue_pending_step(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    step = doc.current_step
    assert step.status == ApprovalStep.Status.PENDING
    _backdate_sla(step, hours_ago=1)

    n = mark_sla_breaches()
    assert n == 1
    step.refresh_from_db()
    assert step.sla_breached_at is not None


@pytest.mark.django_db
def test_skips_step_with_future_sla(memo_type, author, supervisor):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    # sla_due_at в будущем (по умолчанию через 24h из chain step) — не должны
    # фиксировать просрочку.
    n = mark_sla_breaches()
    assert n == 0
    doc.current_step.refresh_from_db()
    assert doc.current_step.sla_breached_at is None


@pytest.mark.django_db
def test_idempotent_does_not_repeat(memo_type, author, supervisor):
    """Повторный запуск не повторяет уведомление."""
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    _backdate_sla(doc.current_step, hours_ago=2)

    assert mark_sla_breaches() == 1
    assert mark_sla_breaches() == 0  # уже зафиксировано


@pytest.mark.django_db
def test_skips_closed_steps(memo_type, author, supervisor):
    """Закрытый approve не считается просроченным даже если sla_due_at в прошлом."""
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    _backdate_sla(doc.current_step, hours_ago=1)
    svc.approve(doc, supervisor, comment="ok")

    assert mark_sla_breaches() == 0


@pytest.mark.django_db
def test_skips_waiting_steps(memo_type, author, supervisor, org):
    """WAITING-шаги (ещё не активные) не считаются просроченными."""
    accountant_group, _ = Group.objects.get_or_create(name="accounting")
    accountant = UserFactory(last_name="Бух", company_unit=org["company"])
    accountant.groups.add(accountant_group)

    memo_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve", "sla_hours": 24},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve",
         "sla_hours": 24},
    ]
    memo_type.default_chain.save()

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)

    # Шаг 2 — WAITING. Backdating его sla не должен порождать просрочку.
    waiting = doc.steps.get(role_key__startswith="group:accounting")
    waiting.sla_due_at = timezone.now() - timedelta(hours=1)
    waiting.save(update_fields=["sla_due_at"])

    assert mark_sla_breaches() == 0
    waiting.refresh_from_db()
    assert waiting.sla_breached_at is None


@pytest.mark.django_db
def test_event_fires_with_step(memo_type, author, supervisor):
    """trigger_event должен вызываться с document + step. Перехватим через monkey-patch."""
    from unittest.mock import patch

    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": "x"})
    svc.submit(doc, author)
    _backdate_sla(doc.current_step, hours_ago=1)

    with patch("apps.edo.internal_docs.services.sla.trigger_event") as mock:
        mark_sla_breaches()
    assert mock.called
    name, kwargs = mock.call_args[0][0], mock.call_args[1]
    assert name == "document.sla_breached"
    assert kwargs["instance"].pk == doc.pk
    assert kwargs["step"].pk == doc.current_step.pk
