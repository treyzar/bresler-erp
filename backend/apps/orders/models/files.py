from django.db import models

from apps.core.models import BaseModel


class FileCategory(models.TextChoices):
    GENERAL = "general", "Общий"
    INCOMING = "incoming", "Входящий"
    OUTGOING = "outgoing", "Исходящий"
    CONTRACT = "contract", "Договор"
    SPECIFICATION = "specification", "Спецификация"
    LETTER = "letter", "Письмо"
    RKD = "rkd", "РКД"
    OTHER = "other", "Другое"


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
    category = models.CharField(
        "Категория",
        max_length=20,
        choices=FileCategory.choices,
        default=FileCategory.GENERAL,
        db_index=True,
    )
    description = models.CharField("Описание", max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Файл заказа"
        verbose_name_plural = "Файлы заказов"
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_name
