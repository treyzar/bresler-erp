from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from simple_history.models import HistoricalRecords

ALLOWED_FILE_TYPES = {
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
    "rar",
    "txt",
    "jpg",
    "jpeg",
    "png",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class Letter(models.Model):
    class Direction(models.TextChoices):
        OUTGOING = "outgoing", "Исходящее"
        INCOMING = "incoming", "Входящее"

    number = models.CharField("Номер документа", max_length=20, unique=True, editable=False)
    seq = models.PositiveIntegerField("Сквозной номер", unique=True, null=True, editable=False)
    date = models.DateField("Дата документа")
    direction = models.CharField(
        "Направление",
        max_length=10,
        choices=Direction.choices,
        default=Direction.OUTGOING,
    )
    recipient = models.CharField("Получатель", max_length=255, blank=True)
    sender = models.CharField("Отправитель", max_length=255, blank=True)
    subject = models.CharField("Тема", max_length=255)
    executor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="executed_letters",
        verbose_name="Исполнитель",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_letters",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Изменено", auto_now=True)
    note = models.TextField("Заметки", blank=True)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Письмо"
        verbose_name_plural = "Письма"
        ordering = ["-seq"]

    def __str__(self):
        return f"{self.number} — {self.subject}"


def _letter_file_upload_path(instance, filename):
    return f"edo/letters/{instance.letter_id}/{filename}"


def _validate_file(file):
    name = file.name.lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in ALLOWED_FILE_TYPES:
        raise ValidationError(f"Тип файла .{ext} не разрешён.")
    if file.size > MAX_FILE_SIZE:
        raise ValidationError("Размер файла превышает 10 МБ.")


class LetterFile(models.Model):
    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name="files")
    file = models.FileField("Файл", upload_to=_letter_file_upload_path, validators=[_validate_file])
    file_name = models.CharField("Имя файла", max_length=255)
    file_type = models.CharField("Тип файла", max_length=50)
    file_size = models.PositiveIntegerField("Размер (байт)")
    uploaded_at = models.DateTimeField("Загружено", auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_letter_files",
        verbose_name="Загрузил",
    )
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Файл письма"
        verbose_name_plural = "Файлы письма"
        ordering = ["uploaded_at"]

    def __str__(self):
        return self.file_name
