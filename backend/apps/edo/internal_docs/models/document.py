"""Экземпляр заполненного документа, шаги согласования и вложения."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from simple_history.models import HistoricalRecords

from .managers import DocumentManager


class Document(models.Model):
    """Заполненный документ: значения полей, статус, цепочка согласования.

    Номер присваивается при submit (draft → pending) через NamingService.
    body_rendered и chain_snapshot фиксируются там же, чтобы последующие
    изменения шаблона типа или цепочки не меняли архивные экземпляры.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PENDING = "pending", "На согласовании"
        APPROVED = "approved", "Согласовано"
        REJECTED = "rejected", "Отклонено"
        REVISION_REQUESTED = "revision_requested", "Запрошены правки"
        CANCELLED = "cancelled", "Отменено"

    type = models.ForeignKey(
        "internal_docs.DocumentType",
        on_delete=models.PROTECT,
        related_name="documents",
        verbose_name="Тип документа",
    )
    number = models.CharField(
        "Номер",
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        help_text="Присваивается при submit (draft → pending)",
    )
    title = models.CharField("Заголовок", max_length=500, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="authored_internal_docs",
        verbose_name="Автор",
    )
    author_company_unit = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.PROTECT,
        related_name="authored_internal_docs",
        verbose_name="Компания автора (снепшот)",
        null=True, blank=True,
        help_text="Фиксируется на момент submit для multi-tenant фильтрации",
    )
    author_department_unit = models.ForeignKey(
        "directory.Department",
        on_delete=models.SET_NULL,
        related_name="authored_internal_docs",
        verbose_name="Подразделение автора (снепшот)",
        null=True, blank=True,
    )
    addressee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_internal_docs",
        verbose_name="Адресат (опционально)",
        null=True, blank=True,
        help_text="Для уведомлений и адресных заявлений",
    )
    field_values = models.JSONField(
        "Значения полей",
        default=dict,
        help_text="По схеме DocumentType.field_schema",
    )
    body_rendered = models.TextField(
        "Отрендеренное тело",
        blank=True,
        help_text="Результат прогона body_template на момент submit; не меняется задним числом",
    )
    header_snapshot = models.JSONField(
        "Снепшот шапки",
        default=dict,
        blank=True,
        help_text='{"company_name": "...", "head_name": "...", "head_position": "..."}',
    )
    status = models.CharField(
        "Статус",
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    current_step = models.ForeignKey(
        "internal_docs.ApprovalStep",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="+",
        verbose_name="Текущий шаг",
    )
    chain_snapshot = models.JSONField(
        "Снепшот цепочки",
        default=list,
        blank=True,
        help_text="Копия ApprovalChainTemplate.steps на момент submit",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords(
        excluded_fields=["body_rendered", "header_snapshot", "chain_snapshot"],
    )

    objects = DocumentManager()

    class Meta:
        verbose_name = "Документ"
        verbose_name_plural = "Документы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["author", "status"]),
            models.Index(fields=["type", "status"]),
            models.Index(fields=["-submitted_at"]),
            # Горячие фильтры в Document.objects.for_user / inbox_for:
            # tenant-scope (author_company_unit) + subtree-видимость (author_department_unit).
            models.Index(fields=["author_company_unit", "status"]),
            models.Index(fields=["author_department_unit"]),
        ]

    def __str__(self):
        return f"{self.number or 'draft'} — {self.title or self.type.name}"


class ApprovalStep(models.Model):
    """Конкретный шаг согласования для одного Document.

    Создаётся при submit — для каждого шага из chain_snapshot делаем запись,
    резолвим approver'а через ChainResolver. Перерезолв (при делегировании)
    апдейтит approver, но не order/role_key.
    """

    class Status(models.TextChoices):
        WAITING = "waiting", "Ожидает активации"  # ещё не активный (параллельный/последующий шаг)
        PENDING = "pending", "Ожидает решения"   # активный — текущий batch согласования
        APPROVED = "approved", "Согласовано"
        REJECTED = "rejected", "Отклонено"
        REVISION_REQUESTED = "revision_requested", "Запрошены правки"
        SKIPPED = "skipped", "Пропущен"
        DELEGATED = "delegated", "Делегирован"

    class Action(models.TextChoices):
        APPROVE = "approve", "Согласовать"
        SIGN = "sign", "Подписать"
        NOTIFY_ONLY = "notify_only", "Только уведомить"
        INFORM = "inform", "Ознакомить"

    class ParallelMode(models.TextChoices):
        AND = "and", "Все участники (AND)"
        OR = "or", "Любой участник (OR)"

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="steps",
        verbose_name="Документ",
    )
    order = models.PositiveSmallIntegerField("Порядок")
    parallel_group = models.CharField(
        "Параллельная группа",
        max_length=50,
        blank=True,
        default="",
        help_text="Одинаковое значение → шаги идут параллельно",
    )
    parallel_mode = models.CharField(
        "Режим параллельного согласования",
        max_length=10,
        choices=ParallelMode.choices,
        default=ParallelMode.AND,
        help_text="AND — все должны согласовать; OR — достаточно одного",
    )
    role_key = models.CharField(
        "Ключ роли",
        max_length=100,
        help_text="supervisor / dept_head:parent / group:accounting@company / fixed_user:42 / ...",
    )
    role_label = models.CharField("Отображаемое название роли", max_length=255)
    action = models.CharField(
        "Действие",
        max_length=20,
        choices=Action.choices,
        default=Action.APPROVE,
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="approval_steps",
        verbose_name="Согласующий",
        help_text="Резолвится при submit",
    )
    original_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="+",
        verbose_name="Изначальный согласующий (до делегирования)",
    )
    status = models.CharField(
        "Статус",
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    comment = models.TextField("Комментарий", blank=True)
    signature_image = models.TextField(
        "Рисованная подпись (data-URL)",
        blank=True,
        help_text="Опционально, если DocumentType.requires_drawn_signature=True",
    )
    sla_due_at = models.DateTimeField("SLA истекает", null=True, blank=True)
    sla_breached_at = models.DateTimeField(
        "SLA нарушен (зафиксировано)",
        null=True, blank=True,
        help_text="Заполняется Celery Beat-задачей check_sla_breaches при первом обнаружении просрочки",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords(
        excluded_fields=["signature_image"],
    )

    class Meta:
        verbose_name = "Шаг согласования"
        verbose_name_plural = "Шаги согласования"
        ordering = ["document", "order"]
        indexes = [
            models.Index(fields=["approver", "status"]),
            models.Index(fields=["document", "order"]),
            # Inbox для group-шагов: WHERE status='pending' AND role_key='group:...'
            models.Index(fields=["status", "role_key"]),
            # for_user смотрит на original_approver (после делегирования / silent pickup)
            models.Index(fields=["original_approver"]),
            # SLA-чекер: WHERE status='pending' AND sla_due_at < now AND sla_breached_at IS NULL
            models.Index(fields=["status", "sla_due_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "order", "parallel_group"],
                name="uniq_step_per_document_order_group",
            ),
        ]

    def __str__(self):
        return f"Шаг {self.order}: {self.role_label} ({self.get_status_display()})"

    def clean(self):
        if self.approver_id and self.approver_id == self.document.author_id and self.role_key != "author":
            raise ValidationError(
                "Автор не может быть согласующим своего же документа (кроме role_key='author')."
            )


def _attachment_upload_path(instance, filename):
    return f"edo/internal_docs/{instance.document_id}/{filename}"


class DocumentAttachment(models.Model):
    """Файл, приложенный к документу автором или согласующим."""

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name="Документ",
    )
    file = models.FileField("Файл", upload_to=_attachment_upload_path)
    file_name = models.CharField("Имя файла", max_length=255)
    file_size = models.PositiveIntegerField("Размер (байт)", default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_internal_doc_files",
        verbose_name="Загрузил",
    )
    step = models.ForeignKey(
        ApprovalStep,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attachments",
        verbose_name="Шаг (если файл прикреплён в рамках шага)",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Вложение документа"
        verbose_name_plural = "Вложения документов"
        ordering = ["uploaded_at"]

    def __str__(self):
        return self.file_name
