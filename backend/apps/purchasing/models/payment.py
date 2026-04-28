from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class PurchasePayment(BaseModel):
    """Оплата по закупочному ордеру."""

    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "На согласовании"
        APPROVED = "approved", "Согласовано"
        PAID = "paid", "Оплачено"
        REJECTED = "rejected", "Отклонено"

    purchase_order = models.ForeignKey(
        "purchasing.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="Закупочный ордер",
    )
    amount = models.DecimalField(
        "Сумма",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    payment_date = models.DateField("Дата оплаты", null=True, blank=True)
    due_date = models.DateField(
        "Срок оплаты",
        null=True,
        blank=True,
        help_text="Для постоплаты — дата, к которой нужно оплатить",
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_APPROVAL,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payments",
        verbose_name="Согласовал",
    )
    invoice_file = models.FileField(
        "Счёт",
        upload_to="purchasing/invoices/%Y/%m/",
        blank=True,
    )
    invoice_number = models.CharField("Номер счёта", max_length=100, blank=True)
    note = models.TextField("Примечание", blank=True)

    class Meta:
        verbose_name = "Оплата закупки"
        verbose_name_plural = "Оплаты закупок"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Оплата {self.amount} → {self.purchase_order}"
