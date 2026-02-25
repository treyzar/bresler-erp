from django.db import models
from simple_history.models import HistoricalRecords
from treebeard.mp_tree import MP_Node

from .geography import Country


class OrgUnit(MP_Node):
    """Organizational unit — tree structure (company → branch → division → department → site)."""

    class UnitType(models.TextChoices):
        COMPANY = "company", "Головная компания / Холдинг"
        BRANCH = "branch", "Филиал / Дочерняя компания"
        DIVISION = "division", "Производственное отделение"
        DEPARTMENT = "department", "Участок"
        SITE = "site", "Площадка"
        OTHER = "other", "Другое"

    class BusinessRole(models.TextChoices):
        CUSTOMER = "customer", "Заказчик"
        SUPPLIER = "supplier", "Поставщик"
        PARTICIPANT = "participant", "Участник запроса"
        INTERNAL = "internal", "Внутренняя компания"
        PARTNER = "partner", "Партнёр / Посредник"
        MANUFACTURER = "manufacturer", "Производитель оборудования"
        CONTRACTOR = "contractor", "Генподрядчик"
        DESIGNER = "designer", "Проектировщик"
        EXPERTISE = "expertise", "Орган экспертизы"
        BUYER_BRANCH = "buyer_branch", "Филиал-покупатель (Legacy)"
        SHIPMENT_SITE = "shipment_site", "Площадка отгрузки (Legacy)"
        OTHER = "other", "Другое"

    name = models.CharField("Название", max_length=255)
    full_name = models.CharField("Полное название", max_length=500, blank=True)
    unit_type = models.CharField(
        "Тип",
        max_length=20,
        choices=UnitType.choices,
        default=UnitType.COMPANY,
    )
    business_role = models.CharField(
        "Бизнес-роль",
        max_length=30,
        choices=BusinessRole.choices,
        blank=True,
    )
    is_legal_entity = models.BooleanField("Юридическое лицо", default=False)
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="org_units",
        verbose_name="Страна",
    )
    inn = models.CharField("ИНН", max_length=20, blank=True, db_index=True)
    kpp = models.CharField("КПП", max_length=20, blank=True)
    ogrn = models.CharField("ОГРН", max_length=20, blank=True)
    external_code = models.CharField(
        "Внешний код",
        max_length=50,
        blank=True,
        db_index=True,
    )
    address = models.TextField("Адрес", blank=True)
    previous_names = models.JSONField(
        "Предыдущие названия",
        default=list,
        blank=True,
    )
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    node_order_by = ["name"]

    class Meta:
        verbose_name = "Организационная единица"
        verbose_name_plural = "Организационные единицы"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["business_role"]),
        ]

    def __str__(self):
        return self.name
