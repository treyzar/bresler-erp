from django.db.models import Max

from apps.orders.models import Order


def get_next_order_number() -> int:
    """Get the next available order number."""
    max_number = Order.objects.aggregate(max_num=Max("order_number"))["max_num"]
    return (max_number or 0) + 1


def create_order(**kwargs) -> Order:
    """Create a new order with auto-generated number."""
    if "order_number" not in kwargs:
        kwargs["order_number"] = get_next_order_number()
    return Order.objects.create(**kwargs)
