from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify
from simple_history.models import HistoricalRecords
from treebeard.mp_tree import MP_Node

from apps.core.models import BaseModel


def _make_slug(val: str) -> str:
    """Генерация slug из кириллицы/латиницы."""
    try:
        from unidecode import unidecode
        return slugify(unidecode(val or ""))
    except ImportError:
        return slugify(val or "")


class ProductCategory(MP_Node):
    """
    Древовидная структура категорий каталога продуктов.

    Уровни:
      1: Категория (РЗА 6–35 кВ, БАВР, НИОКР, ...)
      2: Подкатегория (ОМП, Защита линии, РАС, ...)
      3: Группа устройств
      4: Подгруппа устройств
      5: Исполнение / вариант
    """

    LEVEL_TITLES = {
        1: "Категория",
        2: "Подкатегория",
        3: "Группа устройств",
        4: "Подгруппа устройств",
        5: "Исполнение",
    }

    name = models.CharField(max_length=350, verbose_name="Название")
    short_name = models.CharField(
        max_length=150, blank=True, default="", verbose_name="Сокращённое название"
    )
    slug = models.SlugField(
        max_length=350, unique=True, db_index=True, blank=True, verbose_name="Слаг"
    )
    description = models.TextField(blank=True, default="", verbose_name="Описание")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    node_order_by = ["name"]

    class Meta:
        verbose_name = "Категория каталога"
        verbose_name_plural = "Категории каталога"
        indexes = [
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base = _make_slug(self.name) or "category"
            candidate = base
            i = 2
            while ProductCategory.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{i}"
                i += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def get_full_path(self) -> str:
        ancestors = self.get_ancestors()
        parts = [a.name for a in ancestors] + [self.name]
        return " → ".join(parts)

    @property
    def level_name(self) -> str:
        depth = self.get_depth()
        return self.LEVEL_TITLES.get(depth, f"Уровень {depth}")


class ProductType(BaseModel):
    """Тип продукта (терминал, шкаф, модуль и т.д.)."""

    name = models.CharField(max_length=150, verbose_name="Тип продукта")
    code = models.CharField(
        max_length=150, blank=True, default="", verbose_name="Код типа"
    )
    mark = models.CharField(
        max_length=150, blank=True, default="", verbose_name="Обозначение"
    )
    description = models.TextField(blank=True, default="", verbose_name="Описание")
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        ordering = ["name"]
        verbose_name = "Тип продукта"
        verbose_name_plural = "Типы продуктов"

    def __str__(self):
        return self.name


class Product(BaseModel):
    """Типовая позиция каталога (артикул)."""

    CURRENCY_CHOICES = [
        ("RUB", "RUB"),
        ("EUR", "EUR"),
        ("USD", "USD"),
    ]

    product_type = models.ForeignKey(
        ProductType,
        on_delete=models.PROTECT,
        related_name="products",
        null=True,
        blank=True,
        verbose_name="Тип продукта",
    )
    name = models.CharField(max_length=350, verbose_name="Наименование")
    internal_code = models.CharField(
        max_length=120, unique=True, db_index=True, verbose_name="Артикул/код"
    )
    slug = models.SlugField(
        max_length=350, unique=True, db_index=True, blank=True, verbose_name="Слаг"
    )
    uom = models.CharField(max_length=32, default="шт", verbose_name="Ед. изм.")
    base_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00"), verbose_name="Цена"
    )
    currency = models.CharField(
        max_length=3, choices=CURRENCY_CHOICES, default="RUB", verbose_name="Валюта"
    )
    vat_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("20.00"), verbose_name="НДС, %"
    )
    price_with_vat = models.BooleanField(default=True, verbose_name="Цена с НДС")
    track_serial = models.BooleanField(
        default=True, verbose_name="Требует серийный учёт"
    )
    is_active = models.BooleanField(default=True, db_index=True, verbose_name="Активно")
    is_spare_part = models.BooleanField(
        default=False, verbose_name="ЗИП"
    )
    valid_from = models.DateField(
        blank=True, null=True, verbose_name="Действует с"
    )
    valid_to = models.DateField(
        blank=True, null=True, verbose_name="Действует по"
    )

    history = HistoricalRecords()

    class Meta:
        ordering = ["name"]
        verbose_name = "Типовая позиция"
        verbose_name_plural = "Типовые позиции"

    def __str__(self):
        return f"{self.name} ({self.internal_code})"

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base = _make_slug(self.name) or "product"
            candidate = base
            i = 2
            while Product.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{i}"
                i += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class RZASpec(BaseModel):
    """Спецификация РЗА для типовой позиции (связь Product ↔ DeviceRZA/ModRZA)."""

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="rza_spec",
        verbose_name="Типовая позиция",
    )
    device_rza = models.ForeignKey(
        "devices.DeviceRZA",
        on_delete=models.PROTECT,
        related_name="rza_specs",
        verbose_name="Функциональный код",
    )
    mod_rza = models.ForeignKey(
        "devices.ModRZA",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="rza_specs",
        verbose_name="Модификация",
    )
    description = models.TextField(blank=True, default="", verbose_name="Описание")

    class Meta:
        verbose_name = "Спецификация РЗА"
        verbose_name_plural = "Спецификации РЗА"

    def __str__(self):
        mod = self.mod_rza or "без модификации"
        return f"RZA: {self.device_rza} / {mod}"

    def clean(self):
        if self.mod_rza and self.mod_rza.device_rza_id != self.device_rza_id:
            raise ValidationError(
                "Модификация не принадлежит указанному функциональному коду."
            )


class CatalogPlacement(models.Model):
    """Размещение продукта в категориях каталога (M2M)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="catalog_placements",
        verbose_name="Типовая позиция",
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name="product_placements",
        verbose_name="Категория",
    )

    class Meta:
        verbose_name = "Размещение в каталоге"
        verbose_name_plural = "Размещения в каталоге"
        constraints = [
            models.UniqueConstraint(
                fields=["product", "category"],
                name="unique_product_category",
            )
        ]

    def __str__(self):
        return f"{self.product.internal_code} → {self.category.name}"


class ProductBOMLine(BaseModel):
    """Строка состава изделия (Bill of Materials)."""

    ROLE_CHOICES = [
        ("RZA_TERMINAL", "МП терминал РЗА"),
        ("ACCESSORY", "Аксессуар/узел"),
        ("WIRING", "Проводка/шкафной монтаж"),
        ("MISC", "Прочее"),
    ]

    parent = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="bom_lines",
        verbose_name="Родитель (сборка)",
    )
    child = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="used_in_boms",
        verbose_name="Компонент",
    )
    role = models.CharField(
        max_length=32, choices=ROLE_CHOICES, default="MISC", verbose_name="Роль"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Количество")
    slot_label = models.CharField(
        max_length=120, blank=True, default="", verbose_name="Слот/место"
    )
    track_serial_override = models.BooleanField(
        null=True, blank=True, verbose_name="Серийный учёт (override)"
    )

    class Meta:
        verbose_name = "Строка состава изделия"
        verbose_name_plural = "Состав изделия (BOM)"
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "child", "slot_label"],
                name="unique_bom_parent_child_slot",
            )
        ]
        indexes = [
            models.Index(fields=["parent"]),
            models.Index(fields=["child"]),
        ]

    def __str__(self):
        slot = f" [{self.slot_label}]" if self.slot_label else ""
        return f"{self.parent.internal_code} ← {self.child.internal_code} x{self.quantity}{slot}"

    @property
    def is_serial_tracked(self) -> bool:
        if self.track_serial_override is not None:
            return bool(self.track_serial_override)
        return bool(self.child.track_serial)


class ProductAttribute(BaseModel):
    """Справочник атрибутов продуктов (EAV-паттерн)."""

    VALUE_TYPES = [
        ("string", "Строка"),
        ("decimal", "Число"),
        ("bool", "Да/нет"),
        ("choice", "Один из списка"),
        ("multi_choice", "Несколько из списка"),
    ]

    code = models.CharField(max_length=100, unique=True, verbose_name="Код атрибута")
    name = models.CharField(max_length=200, verbose_name="Название атрибута")
    unit = models.CharField(
        max_length=50, blank=True, default="", verbose_name="Ед. измерения"
    )
    value_type = models.CharField(
        max_length=20, choices=VALUE_TYPES, default="string", verbose_name="Тип значения"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Атрибут продукта"
        verbose_name_plural = "Атрибуты продуктов"

    def __str__(self):
        unit = f", {self.unit}" if self.unit else ""
        return f"{self.name} ({self.code}{unit})"


class ProductAttributeOption(models.Model):
    """Варианты значений для атрибутов типа choice/multi_choice."""

    attribute = models.ForeignKey(
        ProductAttribute,
        on_delete=models.CASCADE,
        related_name="options",
        verbose_name="Атрибут",
    )
    code = models.CharField(max_length=100, verbose_name="Код опции")
    label = models.CharField(max_length=200, verbose_name="Название опции")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        unique_together = ("attribute", "code")
        ordering = ["attribute", "sort_order", "id"]
        verbose_name = "Опция атрибута"
        verbose_name_plural = "Опции атрибутов"

    def __str__(self):
        return f"{self.attribute.code}: {self.label}"


class ProductAttributeValue(BaseModel):
    """Значение атрибута для конкретного продукта."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="attribute_values",
        verbose_name="Продукт",
    )
    attribute = models.ForeignKey(
        ProductAttribute,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name="Атрибут",
    )
    option = models.ForeignKey(
        ProductAttributeOption,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="values",
        verbose_name="Опция",
    )
    value_string = models.CharField(
        max_length=500, blank=True, null=True, verbose_name="Строка"
    )
    value_decimal = models.DecimalField(
        max_digits=20, decimal_places=6, blank=True, null=True, verbose_name="Число"
    )
    value_bool = models.BooleanField(blank=True, null=True, verbose_name="Да/нет")

    class Meta:
        verbose_name = "Значение атрибута"
        verbose_name_plural = "Значения атрибутов"
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["attribute"]),
        ]

    def __str__(self):
        return f"{self.product.internal_code} / {self.attribute.code} = {self.display_value()}"

    def display_value(self):
        vt = self.attribute.value_type
        if vt in ("choice", "multi_choice"):
            return self.option.label if self.option_id else None
        if vt == "string":
            return self.value_string
        if vt == "decimal":
            return self.value_decimal
        if vt == "bool":
            return self.value_bool
        return self.value_string

    def set_value(self, value):
        """Универсальная установка значения в зависимости от типа атрибута."""
        from decimal import Decimal as D

        vt = self.attribute.value_type
        # Очищаем все поля
        self.option = None
        self.value_string = None
        self.value_decimal = None
        self.value_bool = None

        if vt in ("choice", "multi_choice"):
            if isinstance(value, ProductAttributeOption):
                self.option = value
            elif isinstance(value, int):
                self.option_id = value
            elif isinstance(value, str):
                self.option = self.attribute.options.get(code=value)
        elif vt == "string":
            self.value_string = str(value) if value is not None else None
        elif vt == "decimal":
            self.value_decimal = D(str(value)) if value not in (None, "") else None
        elif vt == "bool":
            self.value_bool = None if value is None else bool(value)


class TypicalScheme(BaseModel):
    """Типовая схема."""

    name = models.CharField(max_length=350, verbose_name="Название")
    image = models.FileField(
        upload_to="typical_schemes/", blank=True, null=True, verbose_name="Изображение"
    )
    description = models.TextField(blank=True, default="", verbose_name="Описание")

    class Meta:
        ordering = ["name"]
        verbose_name = "Типовая схема"
        verbose_name_plural = "Типовые схемы"

    def __str__(self):
        return self.name
