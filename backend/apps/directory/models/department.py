"""Внутренняя организационная структура предприятия.

Отделяется от `OrgUnit` (справочник юрлиц и внешних контрагентов) намеренно:
у Department нет ИНН/КПП/страны/истории переименований — это чисто
иерархическая структура подразделений внутри одной компании.

Дерево произвольной глубины: Служба → Отдел → Сектор, или сразу Отдел,
или любая другая комбинация. Глубина определяется содержимым, а не схемой.
"""

from django.db import models
from simple_history.models import HistoricalRecords
from treebeard.mp_tree import MP_Node


class Department(MP_Node):
    """Подразделение внутри конкретной компании (OrgUnit.business_role=internal)."""

    class UnitType(models.TextChoices):
        SERVICE = "service", "Служба"
        DEPARTMENT = "department", "Отдел"
        SECTOR = "sector", "Сектор"
        OTHER = "other", "Другое"

    name = models.CharField("Название", max_length=255)
    full_name = models.CharField("Полное название", max_length=500, blank=True)
    unit_type = models.CharField(
        "Тип",
        max_length=20,
        choices=UnitType.choices,
        default=UnitType.DEPARTMENT,
    )
    company = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.PROTECT,
        related_name="departments",
        verbose_name="Компания",
        help_text="OrgUnit с business_role='internal' — юрлицо, к которому относится подразделение",
    )
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    node_order_by = ["name"]

    class Meta:
        verbose_name = "Подразделение"
        verbose_name_plural = "Подразделения"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["company"]),
        ]

    def __str__(self):
        return self.name
