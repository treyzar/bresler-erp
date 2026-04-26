"""3 отчёта по EDO (ТЗ §11 Фаза 3):
- stuck_documents: документы, которые висят на одном шаге дольше N дней
- sla_breaches: шаги с зафиксированным sla_breached_at в указанном периоде
- top_by_type: топ типов по числу созданных документов за период
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from ..models import ApprovalStep, Document


def stuck_documents(min_pending_days: int = 3) -> list[dict]:
    """Документы, висящие в статусе PENDING дольше `min_pending_days` дней.

    Возвращает список dict'ов с deficits-инфо: чей шаг, как долго ждёт.
    """
    threshold = timezone.now() - timedelta(days=min_pending_days)
    docs = (
        Document.objects
        .filter(status=Document.Status.PENDING, submitted_at__lt=threshold)
        .select_related("type", "author", "current_step", "current_step__approver")
        .order_by("submitted_at")
    )
    out: list[dict] = []
    for d in docs:
        step = d.current_step
        out.append({
            "id": d.pk,
            "number": d.number,
            "title": d.title,
            "type_name": d.type.name if d.type else "",
            "author": d.author.get_full_name() if d.author else "",
            "submitted_at": d.submitted_at.isoformat() if d.submitted_at else None,
            "days_pending": (timezone.now() - d.submitted_at).days if d.submitted_at else None,
            "current_step_label": step.role_label if step else "",
            "current_approver": (
                step.approver.get_full_name() if (step and step.approver) else ""
            ),
        })
    return out


def sla_breaches(period_days: int = 30) -> list[dict]:
    """Шаги с зафиксированным sla_breached_at за последние N дней."""
    since = timezone.now() - timedelta(days=period_days)
    steps = (
        ApprovalStep.objects
        .filter(sla_breached_at__gte=since)
        .select_related("document", "document__type", "approver", "document__author")
        .order_by("-sla_breached_at")
    )
    out: list[dict] = []
    for s in steps:
        d = s.document
        out.append({
            "step_id": s.pk,
            "document_id": d.pk if d else None,
            "number": d.number if d else "",
            "type_name": d.type.name if (d and d.type) else "",
            "role_label": s.role_label,
            "approver": s.approver.get_full_name() if s.approver else "",
            "sla_due_at": s.sla_due_at.isoformat() if s.sla_due_at else None,
            "sla_breached_at": s.sla_breached_at.isoformat() if s.sla_breached_at else None,
            "current_status": s.status,
        })
    return out


def top_by_type(period_days: int = 30, limit: int = 20) -> list[dict]:
    """Топ типов документов по числу созданных в окне `period_days`.

    Возвращает [{type_code, type_name, total, approved, rejected, pending}, ...].
    """
    since = timezone.now() - timedelta(days=period_days)
    qs = (
        Document.objects
        .filter(created_at__gte=since)
        .values("type__code", "type__name")
        .annotate(
            total=Count("id"),
            approved=Count("id", filter=Q(status=Document.Status.APPROVED)),
            rejected=Count("id", filter=Q(status=Document.Status.REJECTED)),
            pending=Count("id", filter=Q(status=Document.Status.PENDING)),
        )
        .order_by("-total")[:limit]
    )
    return [
        {
            "type_code": row["type__code"],
            "type_name": row["type__name"],
            "total": row["total"],
            "approved": row["approved"],
            "rejected": row["rejected"],
            "pending": row["pending"],
        }
        for row in qs
    ]
