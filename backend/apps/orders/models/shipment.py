from django.db import models

from apps.core.models import BaseModel


class ShipmentBatch(BaseModel):
    """A shipment batch for an order — supports multiple partial shipments."""

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="shipment_batches",
        verbose_name="Заказ",
    )
    batch_number = models.PositiveIntegerField("Номер партии")
    ship_date = models.DateField("Дата отгрузки")
    description = models.TextField("Описание", blank=True, default="")

    class Meta:
        verbose_name = "Партия отгрузки"
        verbose_name_plural = "Партии отгрузки"
        ordering = ["batch_number"]
        unique_together = [("order", "batch_number")]

    def __str__(self):
        return f"Партия {self.batch_number} — {self.ship_date}"
