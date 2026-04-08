from django.db import transaction
from django.db.models import F

from apps.purchasing.models import StockItem, StockMovement, StockReservation


def receive_stock(stock_item: StockItem, quantity: int, user, comment: str = "") -> StockMovement:
    """Приход на склад."""
    with transaction.atomic():
        StockItem.objects.filter(pk=stock_item.pk).update(quantity=F("quantity") + quantity)
        stock_item.refresh_from_db()
        return StockMovement.objects.create(
            stock_item=stock_item,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=quantity,
            user=user,
            comment=comment,
        )


def issue_stock(stock_item: StockItem, quantity: int, user, order=None, comment: str = "") -> StockMovement:
    """Расход со склада."""
    if stock_item.available < quantity:
        raise ValueError(f"Недостаточно на складе: доступно {stock_item.available}, запрошено {quantity}")
    with transaction.atomic():
        StockItem.objects.filter(pk=stock_item.pk).update(quantity=F("quantity") - quantity)
        stock_item.refresh_from_db()
        return StockMovement.objects.create(
            stock_item=stock_item,
            movement_type=StockMovement.MovementType.ISSUE,
            quantity=quantity,
            order=order,
            user=user,
            comment=comment,
        )


def reserve_stock(stock_item: StockItem, order, quantity: int, user, comment: str = "") -> StockReservation:
    """Забронировать позицию под заказ."""
    if stock_item.available < quantity:
        raise ValueError(f"Недостаточно для резервирования: доступно {stock_item.available}, запрошено {quantity}")
    with transaction.atomic():
        reservation, created = StockReservation.objects.get_or_create(
            stock_item=stock_item,
            order=order,
            defaults={"quantity": quantity, "reserved_by": user, "comment": comment},
        )
        if not created:
            additional = quantity
            if stock_item.available < additional:
                raise ValueError(f"Недостаточно для доп. резервирования: доступно {stock_item.available}")
            reservation.quantity = F("quantity") + additional
            reservation.save(update_fields=["quantity", "updated_at"])
            reservation.refresh_from_db()

        StockItem.objects.filter(pk=stock_item.pk).update(reserved=F("reserved") + quantity)
        stock_item.refresh_from_db()
        StockMovement.objects.create(
            stock_item=stock_item,
            movement_type=StockMovement.MovementType.RESERVE,
            quantity=quantity,
            order=order,
            user=user,
            comment=comment,
        )
        return reservation


def unreserve_stock(reservation: StockReservation, user, comment: str = "") -> None:
    """Снять бронирование."""
    with transaction.atomic():
        qty = reservation.quantity
        stock_item = reservation.stock_item
        StockItem.objects.filter(pk=stock_item.pk).update(reserved=F("reserved") - qty)
        StockMovement.objects.create(
            stock_item=stock_item,
            movement_type=StockMovement.MovementType.UNRESERVE,
            quantity=qty,
            order=reservation.order,
            user=user,
            comment=comment,
        )
        reservation.delete()
