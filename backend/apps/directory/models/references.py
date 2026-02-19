from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class Equipment(BaseModel):
    """Equipment type reference."""

    name = models.CharField("Название", max_length=255, unique=True)

    class Meta:
        verbose_name = "Оборудование"
        verbose_name_plural = "Оборудование"
        ordering = ["name"]

    def __str__(self):
        return self.name


class TypeOfWork(BaseModel):
    """Type of work reference."""

    name = models.CharField("Название", max_length=255, unique=True)

    class Meta:
        verbose_name = "Вид работ"
        verbose_name_plural = "Виды работ"
        ordering = ["name"]

    def __str__(self):
        return self.name


class DeliveryType(BaseModel):
    """Delivery type reference."""

    name = models.CharField("Название", max_length=255, unique=True)

    class Meta:
        verbose_name = "Тип доставки"
        verbose_name_plural = "Типы доставки"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Intermediary(BaseModel):
    """Intermediary reference."""

    name = models.CharField("Название", max_length=255, unique=True)

    class Meta:
        verbose_name = "Посредник"
        verbose_name_plural = "Посредники"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Designer(BaseModel):
    """Designer (project institute) reference."""

    name = models.CharField("Название", max_length=255, unique=True)

    class Meta:
        verbose_name = "Проектант"
        verbose_name_plural = "Проектанты"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PQ(BaseModel):
    """PQ (qualification) reference."""

    name = models.CharField("Название", max_length=255, unique=True)
    full_name = models.CharField("Полное название", max_length=500, blank=True)
    previous_names = models.JSONField(
        "Предыдущие названия",
        default=list,
        blank=True,
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "ПКЗ"
        verbose_name_plural = "ПКЗ"
        ordering = ["name"]

    def __str__(self):
        return self.name
