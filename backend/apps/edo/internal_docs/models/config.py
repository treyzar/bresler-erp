"""Singleton-конфиг модуля внутреннего документооборота.

Одна строка в БД, правится админом через Django admin. Управляет режимом
межкомпанийной видимости документов, дефолтными таймаутами и PDF-кешем.
"""

from django.core.exceptions import ValidationError
from django.db import models


class InternalDocFlowConfig(models.Model):
    class TenancyScope(models.TextChoices):
        COMPANY_ONLY = "company_only", "Только своя компания"
        GROUP_WIDE = "group_wide", "Вся группа компаний"

    cross_company_scope = models.CharField(
        "Режим межкомпанийной видимости",
        max_length=20,
        choices=TenancyScope.choices,
        default=TenancyScope.COMPANY_ONLY,
        help_text=(
            "company_only: сотрудники компании A не видят документы компании B; "
            "group_wide: публичные документы видны всей группе компаний"
        ),
    )
    default_sla_hours = models.PositiveIntegerField(
        "SLA по умолчанию (часы)",
        default=48,
        help_text="Используется, если в шаге цепочки не задан sla_hours",
    )
    pdf_cache_ttl_hours = models.PositiveIntegerField(
        "TTL кеша PDF (часы)",
        default=168,  # 7 дней
        help_text="Сколько времени хранить сгенерированный PDF на диске",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Конфиг ЭДО"
        verbose_name_plural = "Конфиг ЭДО"

    def __str__(self):
        return f"Конфиг ЭДО (режим: {self.get_cross_company_scope_display()})"

    def clean(self):
        # Singleton: разрешаем только одну строку.
        qs = type(self).objects.all()
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.exists():
            raise ValidationError("Конфиг ЭДО может существовать только в единственном экземпляре.")

    @classmethod
    def get_solo(cls) -> "InternalDocFlowConfig":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
