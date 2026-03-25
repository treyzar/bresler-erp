from django.db import models

from apps.core.models import BaseModel


class VoltageClass(BaseModel):
    """Классификация сетей по напряжению."""

    name = models.CharField(
        max_length=350, verbose_name="Классификация сетей по напряжению"
    )
    description = models.CharField(
        max_length=350, blank=True, default="", verbose_name="Название класса сети"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Класс напряжения"
        verbose_name_plural = "Классы напряжения"

    def __str__(self):
        return self.name


class DeviceRZA(BaseModel):
    """Серия устройств РЗА (функциональный код)."""

    rza_name = models.CharField(
        max_length=350, verbose_name="Наименование устройства"
    )
    rza_name_rod = models.CharField(
        max_length=350,
        blank=True,
        default="",
        verbose_name="Наименование в родительном падеже",
    )
    rza_short_name = models.CharField(
        max_length=250,
        blank=True,
        default="",
        verbose_name="Сокращённое наименование",
    )
    rza_code = models.CharField(
        max_length=350,
        unique=True,
        verbose_name="Функциональный код устройства",
    )

    class Meta:
        ordering = ["rza_code"]
        verbose_name = "Устройство РЗА"
        verbose_name_plural = "Устройства РЗА"

    def __str__(self):
        return f"{self.rza_code} — {self.rza_name}"


class ModRZA(BaseModel):
    """Модификация устройства РЗА."""

    device_rza = models.ForeignKey(
        DeviceRZA,
        on_delete=models.CASCADE,
        related_name="modifications",
        verbose_name="Устройство РЗА",
    )
    mod_name = models.CharField(
        max_length=350, blank=True, default="", verbose_name="Наименование модификации"
    )
    mod_code = models.CharField(
        max_length=350, verbose_name="Код модификации"
    )
    alter_mod_code = models.CharField(
        max_length=1000,
        blank=True,
        default="",
        verbose_name="Альтернативный код модификации",
    )
    sec_mod_code = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Код модификации по ШЭТ",
    )

    class Meta:
        ordering = ["device_rza", "mod_code"]
        verbose_name = "Модификация РЗА"
        verbose_name_plural = "Модификации РЗА"
        constraints = [
            models.UniqueConstraint(
                fields=["device_rza", "mod_code"],
                name="unique_mod_code_per_device",
            )
        ]

    def __str__(self):
        return self.mod_code

    @property
    def full_code(self):
        """Полный код: Бреслер-0107.{rza_code}.{mod_code}"""
        return f"Бреслер-0107.{self.device_rza.rza_code}.{self.mod_code}"
