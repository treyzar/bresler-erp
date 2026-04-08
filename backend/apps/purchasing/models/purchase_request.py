from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class PurchaseRequest(BaseModel):
    """Заявка на закупку — создаётся тех. специалистом."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        SUBMITTED = "submitted", "Подана"
        IN_PROGRESS = "in_progress", "В работе"
        COMPLETED = "completed", "Выполнена"
        CANCELLED = "cancelled", "Отменена"

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="purchase_requests",
        verbose_name="Заказ",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_requests_created",
        verbose_name="Создал",
    )
    status = models.CharField(
        "Статус", max_length=20,
        choices=Status.choices, default=Status.DRAFT,
    )
    required_date = models.DateField(
        "Требуемая дата", null=True, blank=True,
    )
    note = models.TextField("Примечание", blank=True)

    class Meta:
        verbose_name = "Заявка на закупку"
        verbose_name_plural = "Заявки на закупку"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заявка #{self.pk} → Заказ #{self.order.order_number}"


class PurchaseRequestLine(BaseModel):
    """Позиция заявки на закупку."""

    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="Заявка",
    )
    product = models.ForeignKey(
        "devices.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_request_lines",
        verbose_name="Продукт",
    )
    name = models.CharField("Наименование", max_length=500)
    quantity = models.PositiveIntegerField("Количество", default=1)
    target_description = models.CharField(
        "Назначение", max_length=500, blank=True,
        help_text="Шкаф, дверца, заводской номер и т.д.",
    )
    note = models.TextField("Примечание", blank=True)

    class Meta:
        verbose_name = "Позиция заявки"
        verbose_name_plural = "Позиции заявки"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} x{self.quantity}"
