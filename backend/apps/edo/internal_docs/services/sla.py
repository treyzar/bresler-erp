"""SLA-нарушения: периодическая проверка, фиксация и нотификация.

Шаг считается просроченным, если:
- status == PENDING (активный, ждёт решения);
- sla_due_at < now;
- sla_breached_at IS NULL (ещё не зафиксировали — не повторяем уведомление).

При обнаружении просрочки мы:
1. Ставим sla_breached_at = now (атомарно через `update()`, чтобы исключить
   гонку с параллельным approve).
2. Триггерим событие `document.sla_breached` — оно даёт уведомление автору,
   согласующему и (при наличии) его руководителю через apps/notifications.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.core.events import trigger_event

from ..models import ApprovalStep

logger = logging.getLogger(__name__)


@transaction.atomic
def mark_sla_breaches() -> int:
    """Фиксирует просроченные шаги. Возвращает количество новых просрочек."""
    now = timezone.now()
    breached = list(
        ApprovalStep.objects
        .select_for_update(skip_locked=True)
        .filter(
            status=ApprovalStep.Status.PENDING,
            action__in=(ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN),
            sla_due_at__lt=now,
            sla_breached_at__isnull=True,
        )
        .select_related("document", "document__author", "approver")
    )
    if not breached:
        return 0

    pks = [s.pk for s in breached]
    ApprovalStep.objects.filter(pk__in=pks).update(sla_breached_at=now)

    for step in breached:
        try:
            trigger_event(
                "document.sla_breached",
                instance=step.document,
                step=step,
            )
        except Exception:
            logger.exception("Failed to trigger sla_breached for step %s", step.pk)

    logger.info("SLA breaches marked: %s", len(breached))
    return len(breached)
