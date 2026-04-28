from django.db import models

from .components import DeviceComponent
from .parameters import Parameter
from .rza import DeviceRZA, ModRZA


class DeviceRZAParameter(models.Model):
    """Привязка параметра к серии РЗА с ценой."""

    device_rza = models.ForeignKey(
        DeviceRZA,
        on_delete=models.CASCADE,
        related_name="device_parameters",
        verbose_name="Устройство РЗА",
    )
    parameter = models.ForeignKey(
        Parameter,
        on_delete=models.CASCADE,
        related_name="device_rza_assignments",
        verbose_name="Параметр",
    )
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Цена")

    class Meta:
        unique_together = ("device_rza", "parameter")
        verbose_name = "Параметр серии РЗА"
        verbose_name_plural = "Параметры серий РЗА"

    def __str__(self):
        return f"{self.device_rza} — {self.parameter.name}"


class ModRZAParameter(models.Model):
    """Привязка параметра к модификации РЗА с ценой."""

    mod_rza = models.ForeignKey(
        ModRZA,
        on_delete=models.CASCADE,
        related_name="mod_parameters",
        verbose_name="Модификация",
    )
    parameter = models.ForeignKey(
        Parameter,
        on_delete=models.CASCADE,
        related_name="mod_rza_assignments",
        verbose_name="Параметр",
    )
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Цена")

    class Meta:
        unique_together = ("mod_rza", "parameter")
        verbose_name = "Параметр модификации РЗА"
        verbose_name_plural = "Параметры модификаций РЗА"

    def __str__(self):
        return f"{self.mod_rza} — {self.parameter.name}"


class DeviceRZAComponent(models.Model):
    """Привязка компонента к серии РЗА с ценой."""

    device_rza = models.ForeignKey(
        DeviceRZA,
        on_delete=models.CASCADE,
        related_name="device_components",
        verbose_name="Устройство РЗА",
    )
    component = models.ForeignKey(
        DeviceComponent,
        on_delete=models.CASCADE,
        related_name="device_rza_assignments",
        verbose_name="Компонент",
    )
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Цена")

    class Meta:
        unique_together = ("device_rza", "component")
        verbose_name = "Компонент серии РЗА"
        verbose_name_plural = "Компоненты серий РЗА"

    def __str__(self):
        return f"{self.device_rza} — {self.component.component_name}"


class ModRZAComponent(models.Model):
    """Привязка компонента к модификации РЗА с ценой."""

    mod_rza = models.ForeignKey(
        ModRZA,
        on_delete=models.CASCADE,
        related_name="mod_components",
        verbose_name="Модификация",
    )
    component = models.ForeignKey(
        DeviceComponent,
        on_delete=models.CASCADE,
        related_name="mod_rza_assignments",
        verbose_name="Компонент",
    )
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Цена")

    class Meta:
        unique_together = ("mod_rza", "component")
        verbose_name = "Компонент модификации РЗА"
        verbose_name_plural = "Компоненты модификаций РЗА"

    def __str__(self):
        return f"{self.mod_rza} — {self.component.component_name}"
