"""
Data Import models — session-based import pipeline.

Inspired by InvenTree's DataImportSession/DataImportColumnMap/DataImportRow.
Pipeline: UPLOAD → MAPPING → VALIDATION → PROCESSING → COMPLETE
"""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class ImportSession(BaseModel):
    """
    Tracks a single import operation from file upload through completion.
    """

    class Status(models.TextChoices):
        UPLOAD = "upload", "Загрузка"
        MAPPING = "mapping", "Маппинг колонок"
        VALIDATING = "validating", "Валидация"
        PROCESSING = "processing", "Обработка"
        COMPLETE = "complete", "Завершён"
        ERROR = "error", "Ошибка"

    # Supported target models
    class TargetModel(models.TextChoices):
        ORGUNIT = "orgunit", "Организации"
        CONTACT = "contact", "Контакты"
        EQUIPMENT = "equipment", "Оборудование"
        TYPE_OF_WORK = "typeofwork", "Виды работ"
        FACILITY = "facility", "Объекты"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="import_sessions",
    )
    file = models.FileField("Файл", upload_to="imports/%Y/%m/")
    original_filename = models.CharField("Имя файла", max_length=255)
    target_model = models.CharField(
        "Целевая модель",
        max_length=30,
        choices=TargetModel.choices,
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOAD,
    )
    # Detected columns from the uploaded file
    columns = models.JSONField("Колонки файла", default=list)
    # Column mapping: {file_column: model_field}
    column_mapping = models.JSONField("Маппинг колонок", default=dict)
    # Summary after completion
    total_rows = models.PositiveIntegerField("Всего строк", default=0)
    success_count = models.PositiveIntegerField("Успешно", default=0)
    error_count = models.PositiveIntegerField("Ошибок", default=0)
    error_details = models.JSONField("Детали ошибок", default=list)

    class Meta:
        verbose_name = "Сессия импорта"
        verbose_name_plural = "Сессии импорта"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Import {self.target_model} ({self.original_filename})"
