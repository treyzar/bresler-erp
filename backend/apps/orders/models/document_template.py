from django.db import models

from apps.core.models import BaseModel


class DocumentType(models.TextChoices):
    CONTRACT = "contract", "Типовой договор"
    READINESS_LETTER = "readiness_letter", "Письмо о готовности"
    OVERDUE_LETTER = "overdue_letter", "Письмо о просрочке"
    PAYMENT_LETTER = "payment_letter", "Письмо об оплате"
    PROTOCOL = "protocol", "Протокол разногласий"
    OTHER = "other", "Другое"


class CompanyEntity(models.TextChoices):
    NPP = "npp", "НПП Бреслер"
    CHAK = "chak", "ЧАК"
    TECHNOPARK = "technopark", "Технопарк"


class DocumentTemplate(BaseModel):
    """Reusable DOCX template for generating order documents."""

    name = models.CharField("Название", max_length=255)
    document_type = models.CharField(
        "Тип документа",
        max_length=30,
        choices=DocumentType.choices,
        db_index=True,
    )
    entity = models.CharField(
        "Предприятие",
        max_length=20,
        choices=CompanyEntity.choices,
        db_index=True,
    )
    template_file = models.FileField(
        "Файл шаблона",
        upload_to="document_templates/",
    )
    description = models.TextField("Описание", blank=True, default="")
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Шаблон документа"
        verbose_name_plural = "Шаблоны документов"
        ordering = ["entity", "document_type", "name"]

    def __str__(self):
        return f"{self.get_entity_display()} — {self.name}"
