from django.db.models import Max

from apps.core.events import trigger_event
from apps.orders.models import Order


def get_next_order_number() -> int:
    """Get the next available order number."""
    max_number = Order.objects.aggregate(max_num=Max("order_number"))["max_num"]
    return (max_number or 0) + 1


def create_order(user=None, **kwargs) -> Order:
    """Create a new order with auto-generated number."""
    if "order_number" not in kwargs:
        kwargs["order_number"] = get_next_order_number()
    order = Order.objects.create(**kwargs)
    trigger_event("order.created", instance=order, user=user)
    return order


def change_order_status(order: Order, new_status: str, user=None) -> Order:
    """Change order status and trigger event."""
    old_status = order.status
    if old_status == new_status:
        return order
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    trigger_event(
        "order.status_changed",
        instance=order,
        user=user,
        old_status=old_status,
        new_status=new_status,
    )
    return order
