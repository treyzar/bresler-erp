from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel

from .geography import City
from .orgunit import OrgUnit


class Contact(BaseModel):
    """Contact person linked to org units.

    Following the Salesforce / SAP pattern we treat one org as the
    "current" employer via the first entry in `org_units`; `employments`
    is the historical / parallel-employment log. Form UI restricts input
    to a single current organization; history is edited separately.
    """

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


class ContactEmployment(BaseModel):
    """
    Historical / parallel employment record. A contact can have many of
    these; the one with is_current=True represents their current job.
    Independent from Contact.org_units for now (both are kept until a
    future migration consolidates them).
    """

    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="employments",
        verbose_name="Контакт",
    )
    org_unit = models.ForeignKey(
        OrgUnit,
        on_delete=models.CASCADE,
        related_name="employments",
        verbose_name="Организация",
    )
    position = models.CharField("Должность", max_length=255, blank=True)
    start_date = models.DateField("Начало", null=True, blank=True)
    end_date = models.DateField("Окончание", null=True, blank=True)
    is_current = models.BooleanField("Текущая", default=False)
    note = models.CharField("Комментарий", max_length=500, blank=True)

    class Meta:
        verbose_name = "Место работы контакта"
        verbose_name_plural = "Места работы контактов"
        ordering = ["-is_current", "-start_date"]
        indexes = [
            models.Index(fields=["contact", "is_current"]),
        ]

    def __str__(self):
        return f"{self.contact_id} @ {self.org_unit_id}"
