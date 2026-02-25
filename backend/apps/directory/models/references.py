from django.db import models

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
