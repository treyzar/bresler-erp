"""Event handlers: document lifecycle → Notification-ы через apps/notifications.

Выполняются async через Celery (async_task=True) — не блокируют HTTP-ответ.
"""

from __future__ import annotations

import logging

from apps.core.events import on_event
from apps.notifications.services import create_notification

logger = logging.getLogger(__name__)


def _doc_link(document) -> str:
    return f"/edo/documents/{document.pk}/"


@on_event("document.approval_requested", async_task=True)
def notify_approver(event_name, instance=None, step=None, user=None, **kwargs):
    """Шаг назначен согласующему → push ему."""
    document = instance
    if not document or not step or not step.approver_id:
        return
    create_notification(
        recipients=step.approver,
        title=f"На согласовании: {document.title or document.number}",
        message=f"Ваш шаг: «{step.role_label}». Откройте документ, чтобы принять решение.",
        category="info",
        target=document,
        link=_doc_link(document),
        deduplicate_key=f"internal_doc.approval.{document.pk}.{step.pk}",
        deduplicate_hours=1,
    )


@on_event("document.approved", async_task=True)
def notify_author_on_approved(event_name, instance=None, **kwargs):
    document = instance
    if not document:
        return
    create_notification(
        recipients=document.author,
        title=f"Документ согласован: {document.number}",
        message=f"«{document.title}» одобрен по всей цепочке согласования.",
        category="success",
        target=document,
        link=_doc_link(document),
        deduplicate_key=f"internal_doc.approved.{document.pk}",
    )


@on_event("document.rejected", async_task=True)
def notify_author_on_rejected(event_name, instance=None, step=None, user=None, **kwargs):
    document = instance
    if not document:
        return
    approver_name = (
        step.approver.get_full_name() if step and step.approver else "Согласующий"
    )
    comment = (step.comment if step else "").strip() or "без комментария"
    create_notification(
        recipients=document.author,
        title=f"Документ отклонён: {document.number}",
        message=f"{approver_name}: «{comment[:200]}»",
        category="error",
        target=document,
        link=_doc_link(document),
        deduplicate_key=f"internal_doc.rejected.{document.pk}",
    )


@on_event("document.revision_requested", async_task=True)
def notify_author_on_revision(event_name, instance=None, step=None, **kwargs):
    document = instance
    if not document:
        return
    approver_name = (
        step.approver.get_full_name() if step and step.approver else "Согласующий"
    )
    comment = (step.comment if step else "").strip() or "без комментария"
    create_notification(
        recipients=document.author,
        title=f"Запрошены правки: {document.number}",
        message=f"{approver_name}: «{comment[:200]}»",
        category="warning",
        target=document,
        link=_doc_link(document),
        deduplicate_key=f"internal_doc.revision.{document.pk}.{step.pk if step else 0}",
    )


@on_event("document.delegated", async_task=True)
def notify_delegate(event_name, instance=None, step=None, from_user=None, to_user=None, **kwargs):
    if not to_user or not instance:
        return
    create_notification(
        recipients=to_user,
        title=f"Делегировано согласование: {instance.number}",
        message=(
            f"Вам делегирован шаг «{step.role_label if step else ''}». "
            f"Откройте документ, чтобы принять решение."
        ),
        category="info",
        target=instance,
        link=_doc_link(instance),
        deduplicate_key=f"internal_doc.delegated.{instance.pk}.{step.pk if step else 0}",
        deduplicate_hours=1,
    )


@on_event("document.submitted", async_task=True)
def log_submitted(event_name, instance=None, user=None, **kwargs):
    """Submitted event ничего не шлёт напрямую — уведомление идёт через
    approval_requested для первого шага. Здесь только лог для аудита.
    """
    if instance:
        logger.info("Document submitted: pk=%s number=%s", instance.pk, instance.number)
