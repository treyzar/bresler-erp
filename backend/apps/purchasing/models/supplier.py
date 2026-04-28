from decimal import Decimal

from django.db import models

from apps.core.models import BaseModel


class SupplierConditions(BaseModel):
    """Условия поставщика — скидки, условия оплаты, контакты."""

    supplier = models.OneToOneField(
        "directory.OrgUnit",
        on_delete=models.CASCADE,
        related_name="supplier_conditions",
        verbose_name="Поставщик",
        limit_choices_to={"business_role": "supplier"},
    )
    discount_percent = models.DecimalField(
        "Скидка (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    payment_terms = models.CharField(
        "Условия оплаты",
        max_length=500,
        blank=True,
    )
    delivery_terms = models.CharField(
        "Условия доставки",
        max_length=500,
        blank=True,
    )
    notes = models.TextField("Примечания", blank=True)

    class Meta:
        verbose_name = "Условия поставщика"
        verbose_name_plural = "Условия поставщиков"

    def __str__(self):
        return f"Условия: {self.supplier.name}"
