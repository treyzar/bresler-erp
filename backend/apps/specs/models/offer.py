from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class CommercialOffer(BaseModel):
    """Технико-коммерческое предложение (КП)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        SENT = "sent", "Отправлено"
        ACCEPTED = "accepted", "Принято"
        REJECTED = "rejected", "Отклонено"
        EXPIRED = "expired", "Истекло"

    class PaymentTerms(models.TextChoices):
        FIFTY_FIFTY = "50_50", "50% аванс, 50% перед отгрузкой"
        POST_7 = "100_post_7", "100% в течение 7 дней после отгрузки"
        POST_30 = "100_post_30", "100% в течение 30 дней после отгрузки"
        CUSTOM = "custom", "Произвольные условия"

    PAYMENT_TEMPLATE_PERCENTS = {
        "50_50": (Decimal("50"), Decimal("50"), Decimal("0")),
        "100_post_7": (Decimal("0"), Decimal("0"), Decimal("100")),
        "100_post_30": (Decimal("0"), Decimal("0"), Decimal("100")),
    }

    MANUFACTURING_PERIODS = [
        ("30-60", "30–60 дней"),
        ("60-90", "60–90 дней"),
        ("90-120", "90–120 дней"),
        ("120-150", "120–150 дней"),
        ("150-180", "150–180 дней"),
    ]

    WARRANTY_CHOICES = [
        (12, "12 месяцев"),
        (36, "36 месяцев"),
        (60, "60 месяцев"),
    ]

    VALID_DAYS_CHOICES = [
        (14, "14 дней"),
        (30, "30 дней"),
        (60, "60 дней"),
    ]

    # Relations
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="offers",
        verbose_name="Заказ",
    )
    participant = models.ForeignKey(
        "orders.OrderParticipant",
        on_delete=models.CASCADE,
        related_name="offers",
        verbose_name="Участник запроса",
    )
    based_on = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derived_offers",
        verbose_name="На основании КП",
    )
    manager = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_offers",
        verbose_name="Менеджер",
    )
    executor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="executed_offers",
        verbose_name="Исполнитель",
    )

    # Identification
    offer_number = models.CharField(
        "Номер КП",
        max_length=50,
        unique=True,
        blank=True,
    )
    version = models.PositiveIntegerField("Версия", default=1)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    # Dates
    date = models.DateField("Дата КП")
    valid_days = models.PositiveIntegerField("Срок действия (дней)", default=30)
    valid_until = models.DateField(
        "Действует до",
        blank=True,
        null=True,
        help_text="Вычисляется автоматически: дата + срок действия",
    )

    # Financial terms
    vat_rate = models.DecimalField(
        "Ставка НДС, %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("20.00"),
    )
    payment_terms = models.CharField(
        "Условия оплаты",
        max_length=20,
        choices=PaymentTerms.choices,
        default=PaymentTerms.FIFTY_FIFTY,
    )
    advance_percent = models.DecimalField(
        "Аванс, %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("50.00"),
    )
    pre_shipment_percent = models.DecimalField(
        "Перед отгрузкой, %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("50.00"),
    )
    post_payment_percent = models.DecimalField(
        "Постоплата, %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    # Production & delivery
    manufacturing_period = models.CharField(
        "Срок изготовления",
        max_length=20,
        default="60-90",
    )
    warranty_months = models.PositiveIntegerField(
        "Гарантия (мес.)",
        default=60,
    )
    delivery_included = models.BooleanField("Доставка включена", default=False)
    delivery_city = models.CharField(
        "Город доставки",
        max_length=255,
        blank=True,
    )
    additional_conditions = models.TextField(
        "Дополнительные условия",
        blank=True,
        help_text="МЭК, соответствие ТЗ и прочее. Если пусто — не выводится в КП.",
    )

    # Template
    is_template = models.BooleanField(
        "Типовое КП",
        default=False,
        help_text="Сохранить как типовое для участника запроса",
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Коммерческое предложение"
        verbose_name_plural = "Коммерческие предложения"
        ordering = ["-date", "-version"]
        indexes = [
            models.Index(fields=["order", "participant"]),
            models.Index(fields=["status"]),
            models.Index(fields=["manager"]),
        ]

    def __str__(self):
        return f"КП {self.offer_number}"

    def save(self, *args, **kwargs):
        # Auto-calculate valid_until
        if self.date and self.valid_days:
            from datetime import timedelta

            self.valid_until = self.date + timedelta(days=self.valid_days)
        # Auto-fill percents from payment template
        percents = self.PAYMENT_TEMPLATE_PERCENTS.get(self.payment_terms)
        if percents:
            self.advance_percent, self.pre_shipment_percent, self.post_payment_percent = percents
        super().save(*args, **kwargs)

    @property
    def shipment_condition_text(self) -> str:
        """Автоформирование текста условий отгрузки."""
        if self.post_payment_percent > 0:
            return "Срок отгрузки — в течение 10 рабочих дней после уведомления о готовности оборудования к отгрузке."
        return "Срок отгрузки — в течение 10 рабочих дней после полной оплаты оборудования."


class OfferWorkItem(models.Model):
    """Работы в КП."""

    offer = models.ForeignKey(
        CommercialOffer,
        on_delete=models.CASCADE,
        related_name="work_items",
        verbose_name="КП",
    )
    work_type = models.ForeignKey(
        "directory.TypeOfWork",
        on_delete=models.PROTECT,
        related_name="offer_work_items",
        verbose_name="Вид работ",
    )
    included = models.BooleanField("Включено", default=False)
    days = models.PositiveIntegerField("Кол-во дней", default=15)
    specialists = models.PositiveIntegerField("Кол-во специалистов", default=1)
    trips = models.PositiveIntegerField("Кол-во выездов", default=1)
    unit_price = models.DecimalField(
        "Цена за единицу",
        max_digits=14,
        decimal_places=2,
        default=0,
    )
    pricing_mode = models.CharField(
        "Режим цены",
        max_length=20,
        choices=[("separate", "Отдельная строка"), ("included", "Включено в стоимость")],
        default="separate",
    )

    class Meta:
        verbose_name = "Работа в КП"
        verbose_name_plural = "Работы в КП"
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["offer", "work_type"],
                name="unique_offer_work_type",
            )
        ]

    def __str__(self):
        status = "✓" if self.included else "✗"
        return f"{status} {self.work_type.name}"
