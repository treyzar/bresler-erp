from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class Contract(BaseModel):
    """Contract linked to an order (1:1)."""

    class Status(models.TextChoices):
        NOT_PAID = "not_paid", "Не оплачен"
        ADVANCE_PAID = "advance_paid", "Аванс оплачен"
        INTERMEDIATE = "intermediate", "Промежуточная оплата"
        FULLY_PAID = "fully_paid", "Полностью оплачен"

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="contract",
        verbose_name="Заказ",
    )
    contract_number = models.CharField(
        "Номер контракта",
        max_length=100,
        unique=True,
        blank=True,
    )
    contract_date = models.DateField("Дата контракта", null=True, blank=True)
    status = models.CharField(
        "Статус оплаты",
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_PAID,
    )
    advance_percent = models.DecimalField(
        "Аванс %",
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    intermediate_percent = models.DecimalField(
        "Промежуточная оплата %",
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    post_payment_percent = models.DecimalField(
        "Постоплата %",
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    amount = models.DecimalField(
        "Сумма",
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )
    deadline_days = models.PositiveIntegerField(
        "Срок (дней)",
        null=True,
        blank=True,
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Контракт"
        verbose_name_plural = "Контракты"

    def __str__(self):
        return f"Контракт {self.contract_number}"

    def save(self, *args, **kwargs):
        if not self.contract_number:
            self.contract_number = self._generate_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_number() -> str:
        """Auto-generate contract number via NamingSeries if available."""
        try:
            from apps.core.naming import NamingService
            return NamingService.generate("contract")
        except (ValueError, Exception):
            # Fallback if sequence not configured
            from django.db.models import Max
            max_num = Contract.objects.aggregate(m=Max("id"))["m"] or 0
            return f"ДОГ-{max_num + 1}"
