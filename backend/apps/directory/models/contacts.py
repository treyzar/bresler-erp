from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel

from .geography import City
from .orgunit import OrgUnit


class Contact(BaseModel):
    """Contact person linked to org units."""

    full_name = models.CharField("ФИО", max_length=300)
    position = models.CharField("Должность", max_length=255, blank=True)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    address = models.TextField("Адрес", blank=True)
    city = models.ForeignKey(
        City,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contacts",
        verbose_name="Город",
    )
    company = models.CharField("Компания", max_length=255, blank=True)
    org_units = models.ManyToManyField(
        OrgUnit,
        blank=True,
        related_name="contacts",
        verbose_name="Организации",
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Контакт"
        verbose_name_plural = "Контакты"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
