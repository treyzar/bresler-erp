from decimal import Decimal

from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class PurchaseOrder(BaseModel):
    """Закупочный ордер — заказ поставщику."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ORDERED = "ordered", "Заказано"
        PARTIAL = "partial", "Частичная поставка"
        DELIVERED = "delivered", "Доставлено"
        CANCELLED = "cancelled", "Отменено"

    supplier = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        verbose_name="Поставщик",
        limit_choices_to={"business_role": "supplier"},
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
        verbose_name="Заказ",
    )
    purchase_request = models.ForeignKey(
        "purchasing.PurchaseRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
        verbose_name="Заявка на закупку",
    )
    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_orders",
        verbose_name="Закупщик",
    )
    status = models.CharField(
        "Статус", max_length=20,
        choices=Status.choices, default=Status.DRAFT,
    )
    order_date = models.DateField("Дата заказа", null=True, blank=True)
    expected_date = models.DateField("Ожидаемая дата поставки", null=True, blank=True)
    note = models.TextField("Примечание", blank=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Закупочный ордер"
        verbose_name_plural = "Закупочные ордера"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Закупка #{self.pk} — {self.supplier.name}"

    @property
    def total_amount(self) -> Decimal:
        return self.lines.aggregate(
            total=models.Sum("total_price"),
        )["total"] or Decimal("0.00")


class PurchaseOrderLine(BaseModel):
    """Позиция закупочного ордера."""

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="Закупочный ордер",
    )
    product = models.ForeignKey(
        "devices.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_order_lines",
        verbose_name="Продукт",
    )
    name = models.CharField("Наименование", max_length=500)
    quantity = models.PositiveIntegerField("Количество", default=1)
    unit_price = models.DecimalField(
        "Цена за ед.", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )
    total_price = models.DecimalField(
        "Итого", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )
    delivery_date = models.DateField("Срок поставки", null=True, blank=True)
    delivered_quantity = models.PositiveIntegerField("Поставлено", default=0)
    note = models.TextField("Примечание", blank=True)

    class Meta:
        verbose_name = "Позиция закупки"
        verbose_name_plural = "Позиции закупки"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        self.total_price = (Decimal(str(self.unit_price)) * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class PurchaseOrderFile(BaseModel):
    """Файл, прикреплённый к закупочному ордеру (счета, накладные)."""

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Закупочный ордер",
    )
    file = models.FileField("Файл", upload_to="purchasing/files/%Y/%m/")
    original_name = models.CharField("Имя файла", max_length=255)
    file_size = models.PositiveIntegerField("Размер (байт)", default=0)
    description = models.CharField("Описание", max_length=255, blank=True)

    class Meta:
        verbose_name = "Файл закупки"
        verbose_name_plural = "Файлы закупки"
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_name
