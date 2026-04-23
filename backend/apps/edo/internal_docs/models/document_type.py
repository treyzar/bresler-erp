"""Справочник типов документов и цепочек согласования."""

from django.db import models
from simple_history.models import HistoricalRecords


class ApprovalChainTemplate(models.Model):
    """Типовая цепочка согласования: список шагов со строками-резолверами.

    Одна цепочка может быть дефолтной для нескольких типов документов либо
    использоваться только для одного. Фактический состав согласующих резолвится
    на момент submit документа через `ChainResolver`.
    """

    name = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    steps = models.JSONField(
        "Шаги",
        default=list,
        help_text=(
            'Список шагов: [{"order": 1, "role_key": "supervisor", "label": "...", '
            '"action": "approve", "sla_hours": 24, "parallel_group": null}, ...]. '
            "Формат и доступные role_key — см. ТЗ §3.4 + §15.0."
        ),
    )
    is_default = models.BooleanField(
        "Дефолтная",
        default=False,
        help_text="Информационно; реальная привязка — через DocumentType.default_chain",
    )
    is_active = models.BooleanField("Активна", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Цепочка согласования"
        verbose_name_plural = "Цепочки согласования"
        ordering = ["name"]

    def __str__(self):
        return self.name


class DocumentType(models.Model):
    """Тип внутреннего документа (служебка, заявление, смета и т.п.).

    Код — человекочитаемый slug, используется в URL и в сидере MVP-типов.
    Поля schema/template сериализуются как Python-литералы в data-миграции.
    """

    class Category(models.TextChoices):
        MEMO = "memo", "Служебные записки"
        APPLICATION = "application", "Заявления"
        NOTIFICATION = "notification", "Уведомления"
        TRAVEL = "travel", "Командировки"
        BONUS = "bonus", "Премирование"
        OTHER = "other", "Другое"

    class Visibility(models.TextChoices):
        PERSONAL_ONLY = "personal_only", "Только автор и согласующие"
        DEPARTMENT_VISIBLE = "department_visible", "Виден сотрудникам подразделения"
        PUBLIC = "public", "Виден всем (в рамках tenant-скоупа)"

    class TenancyOverride(models.TextChoices):
        GROUP_WIDE = "group_wide", "Вся группа компаний"
        COMPANY_ONLY = "company_only", "Только своя компания"

    class InitiatorResolver(models.TextChoices):
        AUTHOR = "author", "Любой сотрудник"
        DEPARTMENT_HEAD = "department_head", "Только руководитель подразделения"
        GROUP_ACCOUNTING = "group:accounting", "Бухгалтерия"
        GROUP_HR = "group:hr", "HR / Отдел кадров"
        GROUP_ADMIN = "group:admin", "Администраторы"

    class AddresseeMode(models.TextChoices):
        NONE = "none", "Нет адресата"
        SINGLE_USER = "single_user", "Конкретный сотрудник"
        DEPT_HEAD = "dept_head", "Руководитель подразделения"

    code = models.SlugField(
        "Код",
        max_length=50,
        unique=True,
        primary_key=True,
        help_text="Slug: memo_free, memo_overtime, vacation_notification, ...",
    )
    name = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    category = models.CharField(
        "Категория",
        max_length=20,
        choices=Category.choices,
        default=Category.MEMO,
    )
    icon = models.CharField(
        "Иконка",
        max_length=50,
        blank=True,
        help_text="Имя lucide-иконки для UI (file-text, clock-alert, mail, ...)",
    )
    field_schema = models.JSONField(
        "Схема полей",
        default=list,
        help_text="Список полей формы; см. ТЗ §4.2 + §15.0",
    )
    body_template = models.TextField(
        "Шаблон тела",
        blank=True,
        help_text="Django Template Language. Доступны: author, today, document, fields + поля по имени.",
    )
    title_template = models.CharField(
        "Шаблон заголовка",
        max_length=500,
        blank=True,
        help_text='Например: Служебная записка «{{ subject }}»',
    )
    default_chain = models.ForeignKey(
        ApprovalChainTemplate,
        on_delete=models.PROTECT,
        related_name="default_for_types",
        verbose_name="Дефолтная цепочка согласования",
    )
    numbering_sequence = models.ForeignKey(
        "core.NumberSequence",
        on_delete=models.PROTECT,
        related_name="document_types",
        verbose_name="Нумерация",
    )
    requires_drawn_signature = models.BooleanField(
        "Требует рисованную подпись",
        default=False,
        help_text="Для командировочных смет и уведомлений об отпуске",
    )
    visibility = models.CharField(
        "Видимость",
        max_length=30,
        choices=Visibility.choices,
        default=Visibility.PERSONAL_ONLY,
    )
    tenancy_override = models.CharField(
        "Межкомпанийная видимость (override)",
        max_length=20,
        choices=TenancyOverride.choices,
        blank=True,
        default="",
        help_text="Пусто = использовать глобальный InternalDocFlowConfig.cross_company_scope",
    )
    initiator_resolver = models.CharField(
        "Кто может создавать",
        max_length=30,
        choices=InitiatorResolver.choices,
        default=InitiatorResolver.AUTHOR,
    )
    addressee_mode = models.CharField(
        "Режим адресата",
        max_length=20,
        choices=AddresseeMode.choices,
        default=AddresseeMode.NONE,
    )
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Тип документа"
        verbose_name_plural = "Типы документов"
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.code})"
