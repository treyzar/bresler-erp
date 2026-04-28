from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import BaseModel


class ComponentType(BaseModel):
    """Тип компонента терминала."""

    name = models.CharField(max_length=350, unique=True, verbose_name="Название типа компонента")

    class Meta:
        ordering = ["name"]
        verbose_name = "Тип компонента"
        verbose_name_plural = "Типы компонентов"

    def __str__(self):
        return self.name


class DeviceComponent(BaseModel):
    """
    Компонент терминала (универсальная модель).

    Поддерживает синхронизацию с внешней системой ProdUX:
    - produx_id: идентификатор во внешней БД
    - is_active: версионирование (при изменении — старая деактивируется, создаётся новая)
    - additional_data: хранит import_params (analogCount, supplyVoltage, digitalInputVoltage)
    """

    produx_id = models.IntegerField(default=0, db_index=True, verbose_name="Идентификатор в БД ProdUX")
    component_name = models.CharField(max_length=500, verbose_name="Наименование компонента")
    component_type = models.ForeignKey(
        ComponentType,
        on_delete=models.CASCADE,
        related_name="components",
        verbose_name="Тип компонента",
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    additional_data = models.JSONField(blank=True, null=True, verbose_name="Дополнительные данные")

    history = HistoricalRecords()

    class Meta:
        ordering = ["component_name"]
        verbose_name = "Компонент терминала"
        verbose_name_plural = "Компоненты терминалов"
        indexes = [
            models.Index(
                fields=["component_type", "is_active"],
                name="idx_component_type_active",
            ),
        ]

    def __str__(self):
        return f"{self.component_name} ({self.component_type.name})"


def component_image_upload_path(instance, filename):
    component_type = instance.component.component_type.name.replace(" ", "_").replace("/", "_")
    component_name = instance.component.component_name.replace(" ", "_").replace("/", "_")
    return f"images/components/{component_type}/{component_name}/{filename}"


class ComponentVisual(BaseModel):
    """Визуальные данные компонента (изображения видов)."""

    VISUAL_TYPES = [
        ("rear", "Вид сзади"),
        ("front", "Вид спереди"),
        ("outline", "Габарит терминала"),
    ]

    component = models.ForeignKey(
        DeviceComponent,
        on_delete=models.CASCADE,
        related_name="visuals",
        verbose_name="Компонент",
    )
    visual_type = models.CharField(
        max_length=10,
        choices=VISUAL_TYPES,
        default="rear",
        verbose_name="Тип вида",
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Основное изображение",
    )
    image_file = models.ImageField(
        upload_to=component_image_upload_path,
        verbose_name="Изображение",
    )
    name = models.CharField(max_length=200, verbose_name="Название")
    description = models.TextField(blank=True, default="", verbose_name="Описание")
    image_width = models.PositiveIntegerField(null=True, blank=True, verbose_name="Ширина (px)")
    image_height = models.PositiveIntegerField(null=True, blank=True, verbose_name="Высота (px)")

    class Meta:
        ordering = ["-is_primary", "created_at"]
        verbose_name = "Визуальные данные компонента"
        verbose_name_plural = "Визуальные данные компонентов"
        constraints = [
            models.UniqueConstraint(
                fields=["component", "visual_type", "is_primary"],
                condition=models.Q(is_primary=True),
                name="unique_primary_visual_per_type",
            )
        ]

    def __str__(self):
        return f"{self.component.component_name} — {self.get_visual_type_display()}"

    def save(self, *args, **kwargs):
        if self.image_file:
            try:
                from PIL import Image

                with Image.open(self.image_file) as img:
                    self.image_width, self.image_height = img.size
            except Exception:
                pass
        super().save(*args, **kwargs)


class TerminalLayout(BaseModel):
    """Расстановка компонентов в терминале (для визуализации)."""

    mod_rza = models.OneToOneField(
        "devices.ModRZA",
        on_delete=models.CASCADE,
        related_name="layout",
        verbose_name="Модификация",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Пользователь",
    )
    layout_data = models.JSONField(default=dict, verbose_name="Данные расстановки")
    is_auto_generated = models.BooleanField(
        default=True,
        verbose_name="Автоматически сгенерирована",
    )

    class Meta:
        verbose_name = "Расстановка компонентов"
        verbose_name_plural = "Расстановки компонентов"

    def __str__(self):
        return f"Layout: {self.mod_rza}"
