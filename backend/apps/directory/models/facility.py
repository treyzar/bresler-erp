from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel

from .orgunit import OrgUnit


class Facility(BaseModel):
    """Installation facility / project site (Объект)."""

    name = models.CharField("Название", max_length=255)
    org_unit = models.ForeignKey(
        OrgUnit,
        on_delete=models.PROTECT,
        related_name="facilities",
        verbose_name="Организация",
        null=True,
        blank=True,
    )
    address = models.TextField("Адрес", blank=True)
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активен", default=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Объект"
        verbose_name_plural = "Объекты"
        ordering = ["name"]

    def __str__(self):
        return self.name
