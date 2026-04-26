"""Справочник «Шапки организаций» (директор + должность) для шапки PDF.

ТЗ §4.8: к одному `OrgUnit` может относиться цепочка руководителей с историей
смены. На момент создания документа `Document.header_snapshot` фиксирует
актуального директора, чтобы смена руководителя задним числом не ломала
архивные документы.

Active head на дату = запись с `from_date <= date AND (to_date IS NULL OR to_date >= date)`.
"""

from __future__ import annotations

from datetime import date as date_cls

from django.db import models


class OrgUnitHead(models.Model):
    """Руководитель OrgUnit на конкретный период."""

    org_unit = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.CASCADE,
        related_name="heads",
        verbose_name="Организация",
    )
    head_name = models.CharField("ФИО", max_length=255)
    head_position = models.CharField(
        "Должность", max_length=255,
        help_text='Например: «Директор», «Генеральный директор»',
    )
    from_date = models.DateField("Действует с")
    to_date = models.DateField(
        "Действует по", null=True, blank=True,
        help_text="Пусто = действует по сей день",
    )
    note = models.TextField("Примечание", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Руководитель организации"
        verbose_name_plural = "Шапки организаций"
        ordering = ["-from_date"]
        indexes = [
            models.Index(fields=["org_unit", "-from_date"]),
        ]

    def __str__(self):
        return f"{self.head_name} ({self.head_position}) — {self.org_unit_id}"

    @classmethod
    def active_for(cls, org_unit, on_date: date_cls | None = None) -> "OrgUnitHead | None":
        """Активный руководитель на указанную дату (по умолчанию — сегодня)."""
        if org_unit is None:
            return None
        if on_date is None:
            from django.utils import timezone
            on_date = timezone.localdate()
        return (
            cls.objects
            .filter(org_unit=org_unit, from_date__lte=on_date)
            .filter(models.Q(to_date__isnull=True) | models.Q(to_date__gte=on_date))
            .order_by("-from_date")
            .first()
        )
