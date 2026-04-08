from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class Specification(BaseModel):
    """Спецификация к КП."""

    offer = models.OneToOneField(
        "specs.CommercialOffer",
        on_delete=models.CASCADE,
        related_name="specification",
        verbose_name="КП",
    )
    total_amount = models.DecimalField(
        "Сумма без НДС", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )
    total_amount_with_vat = models.DecimalField(
        "Сумма с НДС", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Спецификация"
        verbose_name_plural = "Спецификации"

    def __str__(self):
        return f"Спецификация к {self.offer.offer_number}"

    def recalculate(self):
        """Пересчёт итогов по позициям."""
        total = self.lines.aggregate(total=models.Sum("total_price"))["total"] or Decimal("0.00")
        self.total_amount = total
        vat_multiplier = 1 + self.offer.vat_rate / 100
        self.total_amount_with_vat = (total * vat_multiplier).quantize(Decimal("0.01"))
        self.save(update_fields=["total_amount", "total_amount_with_vat", "updated_at"])


class SpecificationLine(BaseModel):
    """Позиция спецификации."""

    specification = models.ForeignKey(
        Specification,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="Спецификация",
    )
    line_number = models.PositiveIntegerField("№ п/п", default=0)
    product = models.ForeignKey(
        "devices.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specification_lines",
        verbose_name="Продукт из каталога",
    )
    device_rza = models.ForeignKey(
        "devices.DeviceRZA",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specification_lines",
        verbose_name="Устройство РЗА",
    )
    mod_rza = models.ForeignKey(
        "devices.ModRZA",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specification_lines",
        verbose_name="Модификация",
    )
    name = models.CharField("Наименование", max_length=500)
    quantity = models.PositiveIntegerField("Количество", default=1)
    unit_price = models.DecimalField(
        "Цена за ед.", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )
    total_price = models.DecimalField(
        "Итого", max_digits=14, decimal_places=2, default=Decimal("0.00"),
    )
    delivery_date = models.DateField(
        "Срок поставки", null=True, blank=True,
        help_text="Если отличается от общего срока (для отдельных партий)",
    )
    shipment_batch = models.ForeignKey(
        "orders.ShipmentBatch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specification_lines",
        verbose_name="Партия отгрузки",
    )
    note = models.TextField("Примечание", blank=True)

    class Meta:
        verbose_name = "Позиция спецификации"
        verbose_name_plural = "Позиции спецификации"
        ordering = ["line_number"]
        indexes = [
            models.Index(fields=["specification", "line_number"]),
        ]

    def __str__(self):
        return f"{self.line_number}. {self.name} ×{self.quantity}"

    def save(self, *args, **kwargs):
        self.total_price = (Decimal(str(self.unit_price)) * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)
