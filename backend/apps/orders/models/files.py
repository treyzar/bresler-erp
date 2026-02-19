from django.db import models

from apps.core.models import BaseModel


class OrderFile(BaseModel):
    """File attached to an order."""

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Заказ",
    )
    file = models.FileField("Файл", upload_to="order_files/%Y/%m/")
    original_name = models.CharField("Имя файла", max_length=255)
    file_size = models.PositiveIntegerField("Размер (байт)", default=0)

    class Meta:
        verbose_name = "Файл заказа"
        verbose_name_plural = "Файлы заказов"

    def __str__(self):
        return self.original_name
