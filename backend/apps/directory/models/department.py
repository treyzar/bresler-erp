"""Внутренняя организационная структура предприятия.

Отделяется от `OrgUnit` (справочник юрлиц и внешних контрагентов) намеренно:
у Department нет ИНН/КПП/страны/истории переименований — это чисто
иерархическая структура подразделений внутри одной компании.

Дерево произвольной глубины. Резолверы (ChainResolver) ходят по parent/child
и не зависят от конкретного `unit_type` — тип нужен только для UI и
отчётов. Можно без проблем сделать Сектор внутри Отдела, или Отдел внутри
Дирекции, или в 5-6 уровней.

ВАЖНО: «Генеральный директор», «Зам. директора» и т.п. — это НЕ типы узлов
дерева. Это должности (`User.position`) конкретных сотрудников, сидящих в
узле типа MANAGEMENT или DIVISION с `is_department_head=True`. Связь
сотрудник↔позиция живёт на User, а не на Department. Такой же паттерн
используется в SAP HR (Position vs OrgUnit), Oracle HCM, 1С:ЗУП, Workday.

Пример структуры:
    Руководство (management)
    │   ← Иванов А.А., position="Ген. директор", is_department_head=True
    └── Дирекция по РЗА (division)
        │   ← Петров Б.Б., position="Директор по РЗА", is_department_head=True
        └── Служба РЗА (service)
            └── Отдел РЗА 1 (department)
                └── Сектор 6-35 (sector)
"""

from django.db import models
from simple_history.models import HistoricalRecords
from treebeard.mp_tree import MP_Node


class Department(MP_Node):
    """Подразделение внутри конкретной компании (OrgUnit.business_role=internal)."""

    class UnitType(models.TextChoices):
        # Перечислены от крупного к мелкому. Не обязательны в определённом
        # порядке в дереве — резолверы ходят по parent/child, не по типу.
        MANAGEMENT = "management", "Руководство"
        DIVISION = "division", "Дирекция / Управление"
        SERVICE = "service", "Служба"
        DEPARTMENT = "department", "Отдел"
        BUREAU = "bureau", "Бюро"
        SECTOR = "sector", "Сектор"
        GROUP = "group", "Группа"
        SITE = "site", "Участок"
        LABORATORY = "laboratory", "Лаборатория"
        BRANCH = "branch", "Филиал / Представительство"
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
