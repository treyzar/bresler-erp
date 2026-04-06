from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class Country(BaseModel):
    """Country reference."""

    name = models.CharField("Название", max_length=255, unique=True)
    code = models.CharField("Код ISO 3166", max_length=3, blank=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Страна"
        verbose_name_plural = "Страны"
        ordering = ["name"]

    def __str__(self):
        return self.name


class City(BaseModel):
    """City reference."""

    name = models.CharField("Название", max_length=255)
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="cities",
        verbose_name="Страна",
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Город"
        verbose_name_plural = "Города"
        ordering = ["name"]
        unique_together = [("name", "country")]

    def __str__(self):
        return self.name
