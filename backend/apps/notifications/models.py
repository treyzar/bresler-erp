from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import BaseModel


class Notification(BaseModel):
    """
    User notification with optional link to any Django model instance.

    Inspired by InvenTree's NotificationMessage — uses GenericFK to reference
    the target object (order, contract, letter, etc.).
    """

    class Category(models.TextChoices):
        INFO = "info", "Информация"
        SUCCESS = "success", "Успех"
        WARNING = "warning", "Предупреждение"
        ERROR = "error", "Ошибка"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Получатель",
    )
    title = models.CharField("Заголовок", max_length=255)
    message = models.TextField("Сообщение", max_length=500, blank=True)
    category = models.CharField(
        "Категория",
        max_length=10,
        choices=Category.choices,
        default=Category.INFO,
    )
    is_read = models.BooleanField("Прочитано", default=False, db_index=True)

    # Generic FK to link notification to any object (Order, Contract, etc.)
    target_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="Тип объекта",
    )
    target_id = models.PositiveIntegerField("ID объекта", null=True, blank=True)
    target = GenericForeignKey("target_type", "target_id")

    # URL path for frontend navigation (e.g., "/orders/1234")
    link = models.CharField("Ссылка", max_length=500, blank=True)

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self):
        return f"[{self.recipient}] {self.title}"


class NotificationPreference(models.Model):
    """
    Per-user notification preferences — which event categories to receive
    and through which channels (in-app bell, email).

    Created on first access via get_or_create in the service layer.
    """

    class Channel(models.TextChoices):
        BELL = "bell", "Только в приложении"
        EMAIL = "email", "Только email"
        ALL = "all", "Приложение + email"
        NONE = "none", "Отключены"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
        verbose_name="Пользователь",
    )

    # Per-category channel settings
    order_created = models.CharField(
        "Новые заказы",
        max_length=10,
        choices=Channel.choices,
        default=Channel.BELL,
    )
    order_status_changed = models.CharField(
        "Изменение статуса заказа",
        max_length=10,
        choices=Channel.choices,
        default=Channel.ALL,
    )
    order_deadline = models.CharField(
        "Дедлайны и просрочки",
        max_length=10,
        choices=Channel.choices,
        default=Channel.ALL,
    )
    contract_payment = models.CharField(
        "Оплата контрактов",
        max_length=10,
        choices=Channel.choices,
        default=Channel.BELL,
    )
    comments = models.CharField(
        "Комментарии",
        max_length=10,
        choices=Channel.choices,
        default=Channel.BELL,
    )
    import_completed = models.CharField(
        "Завершение импорта",
        max_length=10,
        choices=Channel.choices,
        default=Channel.BELL,
    )

    class Meta:
        verbose_name = "Настройки уведомлений"
        verbose_name_plural = "Настройки уведомлений"

    def __str__(self):
        return f"Настройки уведомлений: {self.user}"

    def get_channel(self, event_key: str) -> str:
        """
        Get channel setting for a given event key.
        Falls back to BELL if key is unknown.
        """
        return getattr(self, event_key, self.Channel.BELL)

    def is_bell_enabled(self, event_key: str) -> bool:
        channel = self.get_channel(event_key)
        return channel in (self.Channel.BELL, self.Channel.ALL)

    def is_email_enabled(self, event_key: str) -> bool:
        channel = self.get_channel(event_key)
        return channel in (self.Channel.EMAIL, self.Channel.ALL)


class NotificationEntry(models.Model):
    """
    Deduplication tracker — prevents sending the same notification
    to the same user more than once within a time window.

    Inspired by InvenTree's NotificationEntry.
    """

    key = models.CharField("Ключ", max_length=255)
    uid = models.PositiveIntegerField("ID объекта")
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Запись дедупликации"
        verbose_name_plural = "Записи дедупликации"
        unique_together = [("key", "uid", "recipient")]

    @classmethod
    def check_recent(cls, key: str, uid: int, recipient_id: int, hours: int = 24) -> bool:
        """Return True if a notification with this key+uid was sent recently."""
        from django.utils import timezone
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(hours=hours)
        return cls.objects.filter(
            key=key, uid=uid, recipient_id=recipient_id, updated__gte=cutoff
        ).exists()

    @classmethod
    def notify(cls, key: str, uid: int, recipient_id: int) -> None:
        """Record that a notification was sent."""
        cls.objects.update_or_create(
            key=key, uid=uid, recipient_id=recipient_id,
            defaults={},
        )
