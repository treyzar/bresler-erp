from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class OverheadType(models.TextChoices):
    EQUIPMENT = "equipment", "Оборудование (15%)"
    PURCHASED = "purchased", "Покупное (30%)"
    NKU = "nku", "НКУ (30%)"
    CUSTOM = "custom", "Произвольный"


OVERHEAD_DEFAULTS = {
    "equipment": 15,
    "purchased": 30,
    "nku": 30,
    "custom": 0,
}


class OfferCalculation(BaseModel):
    """Calculation (расчёт) for a CommercialOffer — pricing before spec."""

    offer = models.OneToOneField(
        "specs.CommercialOffer",
        on_delete=models.CASCADE,
        related_name="calculation",
        verbose_name="КП",
    )
    default_overhead_percent = models.DecimalField(
        "НР по умолчанию, %",
        max_digits=5, decimal_places=2, default=15,
    )
    default_project_coeff = models.DecimalField(
        "Проектный коэффициент по умолчанию",
        max_digits=6, decimal_places=4, default=1,
    )
    default_discount_coeff = models.DecimalField(
        "Скидочный коэффициент по умолчанию",
        max_digits=6, decimal_places=4, default=1,
    )
    note = models.TextField("Примечание", blank=True, default="")
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Расчёт к КП"
        verbose_name_plural = "Расчёты к КП"

    def __str__(self):
        return f"Расчёт к {self.offer.offer_number}"

    def recalculate(self):
        """Recalculate all lines."""
        for line in self.lines.all():
            line.save()  # triggers auto-calculation in save()


class CalculationLine(BaseModel):
    """A single line item in the calculation."""

    calculation = models.ForeignKey(
        OfferCalculation,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="Расчёт",
    )
    line_number = models.PositiveIntegerField("№ п/п")
    product = models.ForeignKey(
        "devices.Product", on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Продукт",
    )
    device_rza = models.ForeignKey(
        "devices.DeviceRZA", on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Устройство РЗА",
    )
    mod_rza = models.ForeignKey(
        "devices.ModRZA", on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Модификация",
    )
    name = models.CharField("Наименование", max_length=500)
    quantity = models.PositiveIntegerField("Количество", default=1)

    # Pricing
    base_price = models.DecimalField(
        "Базовая цена", max_digits=14, decimal_places=2, default=0,
    )
    overhead_type = models.CharField(
        "Тип НР", max_length=20,
        choices=OverheadType.choices, default=OverheadType.EQUIPMENT,
    )
    overhead_percent = models.DecimalField(
        "НР, %", max_digits=5, decimal_places=2, default=15,
    )
    price_with_overhead = models.DecimalField(
        "Цена с НР", max_digits=14, decimal_places=2, default=0,
    )
    project_coeff = models.DecimalField(
        "Проектный К", max_digits=6, decimal_places=4, default=1,
    )
    estimated_price = models.DecimalField(
        "Сметная цена", max_digits=14, decimal_places=2, default=0,
    )
    discount_coeff = models.DecimalField(
        "Скидочный К", max_digits=6, decimal_places=4, default=1,
    )
    discounted_price = models.DecimalField(
        "Цена со скидкой", max_digits=14, decimal_places=2, default=0,
    )
    total_price = models.DecimalField(
        "Итого (кол-во × цена со скидкой)", max_digits=14, decimal_places=2, default=0,
    )
    note = models.CharField("Примечание", max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Позиция расчёта"
        verbose_name_plural = "Позиции расчёта"
        ordering = ["line_number"]

    def __str__(self):
        return f"{self.line_number}. {self.name}"

    def save(self, **kwargs):
        from decimal import Decimal
        bp = Decimal(str(self.base_price))
        oh = Decimal(str(self.overhead_percent))
        pk = Decimal(str(self.project_coeff))
        dk = Decimal(str(self.discount_coeff))
        qty = Decimal(str(self.quantity))

        self.price_with_overhead = (bp * (1 + oh / 100)).quantize(Decimal("0.01"))
        self.estimated_price = (self.price_with_overhead * pk).quantize(Decimal("0.01"))
        self.discounted_price = (self.estimated_price * dk).quantize(Decimal("0.01"))
        self.total_price = (qty * self.discounted_price).quantize(Decimal("0.01"))
        super().save(**kwargs)
