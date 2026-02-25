from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel
from apps.directory.models import (
    Contact,
    Country,
    Equipment,
    OrgUnit,
    TypeOfWork,
)


class Order(BaseModel):
    """Main order model."""

    class Status(models.TextChoices):
        NEW = "N", "Новый"
        IN_PROGRESS = "P", "В работе"
        COMPLETED = "C", "Завершён"
        TENDER = "T", "Тендер"
        ARCHIVED = "A", "Архив"

    order_number = models.PositiveIntegerField(
        "Номер заказа",
        unique=True,
    )
    tender_number = models.CharField(
        "Номер тендера",
        max_length=100,
        blank=True,
    )
    status = models.CharField(
        "Статус",
        max_length=1,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    note = models.TextField("Примечание", blank=True)
    start_date = models.DateField("Дата начала", null=True, blank=True)
    ship_date = models.DateField("Дата отгрузки", null=True, blank=True)

    # Foreign keys
    customer_org_unit = models.ForeignKey(
        OrgUnit,
        on_delete=models.PROTECT,
        related_name="customer_orders",
        verbose_name="Заказчик",
        null=True,
        blank=True,
    )
    intermediary = models.ForeignKey(
        OrgUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="intermediary_orders",
        verbose_name="Посредник",
    )
    designer = models.ForeignKey(
        OrgUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="designer_orders",
        verbose_name="Проектировщик",
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="Страна",
    )

    # M2M relations
    org_units = models.ManyToManyField(
        OrgUnit,
        through="OrderOrgUnit",
        related_name="orders",
        blank=True,
        verbose_name="Организации",
    )
    contacts = models.ManyToManyField(
        Contact,
        blank=True,
        related_name="orders",
        verbose_name="Контакты",
    )
    managers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="managed_orders",
        verbose_name="Менеджеры",
    )
    equipments = models.ManyToManyField(
        Equipment,
        blank=True,
        related_name="orders",
        verbose_name="Оборудование",
    )
    works = models.ManyToManyField(
        TypeOfWork,
        blank=True,
        related_name="orders",
        verbose_name="Виды работ",
    )
    participants = models.ManyToManyField(
        OrgUnit,
        through="OrderParticipant",
        related_name="participant_orders",
        blank=True,
        verbose_name="Участники ЦЗ",
    )
    related_orders = models.ManyToManyField(
        "self",
        blank=True,
        verbose_name="Связанные заказы",
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ["-order_number"]

    def __str__(self):
        return f"Заказ #{self.order_number}"


class OrderOrgUnit(models.Model):
    """Through model for Order ↔ OrgUnit with role."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.CASCADE)
    role = models.CharField("Роль", max_length=50, blank=True)
    order_index = models.PositiveIntegerField("Порядок", default=0)
    note = models.TextField("Примечание", blank=True)

    class Meta:
        unique_together = [("order", "org_unit", "role")]
        ordering = ["order_index"]


class OrderParticipant(models.Model):
    """Through model for Order ↔ OrgUnit participants (price request participants)."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.CASCADE)
    order_index = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order_index"]
        verbose_name = "Участник ЦЗ"
        verbose_name_plural = "Участники ЦЗ"
