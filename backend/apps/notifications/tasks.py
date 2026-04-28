"""Celery tasks for notifications — deadline checks and cleanup."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("notifications")


@shared_task
def check_order_deadlines():
    """
    Check for overdue orders and approaching deadlines.
    Runs daily via Celery Beat.
    """
    from apps.notifications.services import create_notification
    from apps.orders.models import Order

    today = timezone.now().date()
    active_statuses = [
        Order.Status.NEW,
        Order.Status.CONTRACT,
        Order.Status.PRODUCTION,
        Order.Status.ASSEMBLED,
    ]

    # 1. Overdue orders (ship_date < today)
    overdue_orders = (
        Order.objects.filter(
            status__in=active_statuses,
            ship_date__lt=today,
            ship_date__isnull=False,
        )
        .select_related("customer_org_unit")
        .prefetch_related("managers")
    )

    overdue_count = 0
    for order in overdue_orders:
        days_overdue = (today - order.ship_date).days
        recipients = order.managers.filter(is_active=True)
        if recipients.exists():
            create_notification(
                recipients=recipients,
                title=f"Заказ #{order.order_number}: просрочка {days_overdue} дн.",
                message=f"Дата отгрузки: {order.ship_date.strftime('%d.%m.%Y')}",
                category="error",
                target=order,
                deduplicate_key="order.overdue",
                deduplicate_hours=24,
            )
            overdue_count += 1

    # 2. Approaching deadline (ship_date within 3 days)
    deadline_soon = today + timedelta(days=3)
    approaching_orders = (
        Order.objects.filter(
            status__in=active_statuses,
            ship_date__range=(today, deadline_soon),
            ship_date__isnull=False,
        )
        .select_related("customer_org_unit")
        .prefetch_related("managers")
    )

    approaching_count = 0
    for order in approaching_orders:
        days_left = (order.ship_date - today).days
        recipients = order.managers.filter(is_active=True)
        if recipients.exists():
            create_notification(
                recipients=recipients,
                title=f"Заказ #{order.order_number}: отгрузка через {days_left} дн.",
                message=f"Дата отгрузки: {order.ship_date.strftime('%d.%m.%Y')}",
                category="warning",
                target=order,
                deduplicate_key="order.deadline_approaching",
                deduplicate_hours=24,
            )
            approaching_count += 1

    logger.info(
        "Deadline check complete: %d overdue, %d approaching",
        overdue_count,
        approaching_count,
    )
    return {
        "overdue": overdue_count,
        "approaching": approaching_count,
    }


@shared_task
def send_email_digest():
    """
    Send email digest of unread notifications to users with email enabled.
    Runs daily via Celery Beat (e.g., at 09:00).
    """
    from apps.notifications.services import send_email_digest as _send_digest

    sent = _send_digest()
    logger.info("Email digest: %d emails sent", sent)
    return {"emails_sent": sent}


@shared_task
def cleanup_old_notifications():
    """Delete read notifications older than 90 days."""
    from apps.notifications.models import Notification, NotificationEntry

    cutoff = timezone.now() - timedelta(days=90)

    deleted_notif, _ = Notification.objects.filter(is_read=True, created_at__lt=cutoff).delete()

    deleted_entries, _ = NotificationEntry.objects.filter(updated__lt=cutoff).delete()

    logger.info(
        "Cleanup: %d notifications, %d dedup entries deleted",
        deleted_notif,
        deleted_entries,
    )
    return {"deleted_notifications": deleted_notif, "deleted_entries": deleted_entries}
