"""
Event handlers that create notifications.

These handlers are registered via @on_event() and automatically loaded
in NotificationsConfig.ready().
"""

from apps.core.events import on_event
from apps.notifications.services import create_notification


@on_event("order.created", async_task=True)
def on_order_created(event_name, instance, user=None, **kwargs):
    """Notify order managers when a new order is created."""
    # Only notify managers assigned to this order (not all users)
    recipients = instance.managers.filter(is_active=True)
    if user:
        recipients = recipients.exclude(pk=user.pk)

    if not recipients.exists():
        return

    customer_name = _get_customer_name(instance)

    create_notification(
        recipients=recipients,
        title=f"Новый заказ #{instance.order_number}",
        message=f"Создан заказ для {customer_name}" if customer_name else "",
        target=instance,
        deduplicate_key="order.created",
    )


@on_event("import.completed", async_task=True)
def on_import_completed(event_name, instance, user=None, **kwargs):
    """Notify user when their import session completes."""
    if not user:
        return

    category = "success" if instance.error_count == 0 else "warning"
    message = f"Создано: {instance.success_count}"
    if instance.error_count > 0:
        message += f", ошибок: {instance.error_count}"

    create_notification(
        recipients=user,
        title=f"Импорт завершён: {instance.original_filename}",
        message=message,
        category=category,
    )


def _get_customer_name(order):
    """Get customer name from direct FK or org_units with role."""
    # Direct FK
    if order.customer_org_unit:
        return order.customer_org_unit.name

    # Fallback: look for org_unit with customer role in through table
    customer_ou = order.orderorgunit_set.filter(role="customer").select_related("org_unit").first()
    if customer_ou:
        return customer_ou.org_unit.name

    return None


@on_event("order.updated", async_task=True)
def on_order_updated(event_name, instance, user=None, changed_fields=None, **kwargs):
    """Notify order managers when order fields (other than status) change."""
    recipients = instance.managers.filter(is_active=True)
    if user:
        recipients = recipients.exclude(pk=user.pk)

    if not recipients.exists():
        return

    fields_str = ", ".join(changed_fields or []) if changed_fields else "данные"
    create_notification(
        recipients=recipients,
        title=f"Заказ #{instance.order_number} обновлён",
        message=f"Изменено: {fields_str}",
        target=instance,
        deduplicate_key="order.updated",
        deduplicate_hours=1,
    )


@on_event("order.status_changed", async_task=True)
def on_order_status_changed(event_name, instance, user=None, old_status=None, new_status=None, **kwargs):
    """Notify order managers when status changes."""
    from apps.orders.models import Order

    status_display = dict(Order.Status.choices)
    old_label = status_display.get(old_status, old_status)
    new_label = status_display.get(new_status, new_status)

    # Notify all managers of this order (except the one who changed it)
    recipients = instance.managers.filter(is_active=True)
    if user:
        recipients = recipients.exclude(pk=user.pk)

    if recipients.exists():
        create_notification(
            recipients=recipients,
            title=f"Заказ #{instance.order_number}: {old_label} → {new_label}",
            message=f"Статус изменён пользователем {user}" if user else "",
            target=instance,
            deduplicate_key="order.status_changed",
        )


@on_event("contract.payment_changed", async_task=True)
def on_contract_payment_changed(event_name, instance, user=None, old_status=None, new_status=None, **kwargs):
    """Notify order managers when payment status changes."""
    from apps.orders.models import Contract

    status_display = dict(Contract.Status.choices)
    new_label = status_display.get(new_status, new_status)

    order = instance.order
    recipients = order.managers.filter(is_active=True)
    if user:
        recipients = recipients.exclude(pk=user.pk)

    if recipients.exists():
        create_notification(
            recipients=recipients,
            title=f"Контракт {instance.contract_number}: {new_label}",
            message=f"Оплата по заказу #{order.order_number}",
            category="success" if new_status == "fully_paid" else "info",
            target=instance,
            deduplicate_key="contract.payment_changed",
        )
