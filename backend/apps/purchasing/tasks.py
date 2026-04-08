import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="apps.purchasing.tasks.check_payment_deadlines")
def check_payment_deadlines():
    """Check for payments approaching due_date and overdue payments.

    Runs daily via Celery Beat. Creates notifications for purchasers.
    """
    from apps.notifications.services import create_notification
    from apps.purchasing.models import PurchasePayment

    today = timezone.now().date()
    warning_date = today + timedelta(days=3)

    # Overdue payments (approved but not paid, due_date < today)
    overdue = PurchasePayment.objects.filter(
        status=PurchasePayment.Status.APPROVED,
        due_date__lt=today,
    ).select_related("purchase_order__supplier", "purchase_order__purchaser")

    overdue_count = 0
    for payment in overdue:
        purchaser = payment.purchase_order.purchaser
        if not purchaser or not purchaser.is_active:
            continue
        supplier = payment.purchase_order.supplier.name
        create_notification(
            recipients=[purchaser],
            title=f"Просрочена оплата поставщику {supplier}",
            message=f"Счёт {payment.invoice_number or '—'} на {payment.amount} руб. просрочен (срок: {payment.due_date}).",
            category="error",
            target=payment.purchase_order,
            deduplicate_key="payment.overdue",
            deduplicate_hours=24,
        )
        overdue_count += 1

    # Approaching deadline (due_date within 3 days)
    approaching = PurchasePayment.objects.filter(
        status=PurchasePayment.Status.APPROVED,
        due_date__gte=today,
        due_date__lte=warning_date,
    ).select_related("purchase_order__supplier", "purchase_order__purchaser")

    approaching_count = 0
    for payment in approaching:
        purchaser = payment.purchase_order.purchaser
        if not purchaser or not purchaser.is_active:
            continue
        supplier = payment.purchase_order.supplier.name
        create_notification(
            recipients=[purchaser],
            title=f"Приближается срок оплаты: {supplier}",
            message=f"Счёт {payment.invoice_number or '—'} на {payment.amount} руб. — срок {payment.due_date}.",
            category="warning",
            target=payment.purchase_order,
            deduplicate_key="payment.deadline_approaching",
            deduplicate_hours=24,
        )
        approaching_count += 1

    logger.info("Payment deadlines: %d overdue, %d approaching", overdue_count, approaching_count)
    return {"overdue": overdue_count, "approaching": approaching_count}
