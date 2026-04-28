from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class StockItem(BaseModel):
    """Позиция на складе — остаток конкретного продукта."""

    product = models.OneToOneField(
        "devices.Product",
        on_delete=models.CASCADE,
        related_name="stock_item",
        verbose_name="Продукт",
    )
    quantity = models.PositiveIntegerField("Количество на складе", default=0)
    reserved = models.PositiveIntegerField("Зарезервировано", default=0)

    class Meta:
        verbose_name = "Позиция на складе"
        verbose_name_plural = "Позиции на складе"
        ordering = ["product__name"]

    def __str__(self):
        return f"{self.product.name}: {self.quantity} (резерв: {self.reserved})"

    @property
    def available(self) -> int:
        return max(self.quantity - self.reserved, 0)


class StockMovement(BaseModel):
    """Движение по складу — приход, расход, резервирование."""

    class MovementType(models.TextChoices):
        RECEIPT = "receipt", "Приход"
        ISSUE = "issue", "Расход"
        RESERVE = "reserve", "Резервирование"
        UNRESERVE = "unreserve", "Снятие резерва"

    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name="Позиция",
    )
    movement_type = models.CharField(
        "Тип движения",
        max_length=20,
        choices=MovementType.choices,
    )
    quantity = models.PositiveIntegerField("Количество")
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
        verbose_name="Заказ",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_movements",
        verbose_name="Пользователь",
    )
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Движение по складу"
        verbose_name_plural = "Движения по складу"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_movement_type_display()}: {self.stock_item.product.name} x{self.quantity}"


class StockReservation(BaseModel):
    """Бронирование позиции на складе под конкретный заказ."""

    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.CASCADE,
        related_name="reservations",
        verbose_name="Позиция",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="stock_reservations",
        verbose_name="Заказ",
    )
    quantity = models.PositiveIntegerField("Количество")
    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_reservations",
        verbose_name="Кто забронировал",
    )
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"
        unique_together = [("stock_item", "order")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Бронь: {self.stock_item.product.name} x{self.quantity} → Заказ #{self.order.order_number}"
