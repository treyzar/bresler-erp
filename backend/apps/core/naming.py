"""
Naming Series — universal document numbering.

Inspired by ERPNext Naming Series and Odoo IR Sequence.
Provides configurable, atomic number generation for any document type.

Usage:
    # Generate next number:
    number = NamingService.generate("order")  # → "ORD-2026-0001"

    # With custom pattern:
    NamingService.generate("contract")  # → "ДОГ-2026-0001"
"""

import logging
import re
from datetime import date

from django.db import models, transaction
from django.db.models import F

from apps.core.models import BaseModel

logger = logging.getLogger("core.naming")


class NumberSequence(BaseModel):
    """
    Configurable number sequence for document auto-numbering.
    """

    class ResetPeriod(models.TextChoices):
        NEVER = "never", "Никогда"
        YEARLY = "yearly", "Ежегодно"

    name = models.CharField("Код", max_length=50, unique=True, help_text="e.g. 'order', 'contract'")
    prefix = models.CharField("Префикс", max_length=20, help_text="e.g. 'ORD', 'ДОГ'")
    pattern = models.CharField(
        "Шаблон",
        max_length=100,
        default="{prefix}-{YYYY}-{####}",
        help_text="Доступные переменные: {prefix}, {YYYY}, {YY}, {MM}, {####}, {######}",
    )
    current_value = models.PositiveIntegerField("Текущее значение", default=0)
    reset_period = models.CharField(
        "Сброс счётчика",
        max_length=10,
        choices=ResetPeriod.choices,
        default=ResetPeriod.YEARLY,
    )
    last_reset_year = models.PositiveIntegerField("Год последнего сброса", default=0)

    class Meta:
        verbose_name = "Последовательность нумерации"
        verbose_name_plural = "Последовательности нумерации"

    def __str__(self):
        return f"{self.name} ({self.prefix})"


class NamingService:
    """Generate sequential document numbers atomically."""

    @staticmethod
    def generate(sequence_name: str) -> str:
        """
        Generate next number for a given sequence.
        Thread-safe via select_for_update + F-expression.
        """
        today = date.today()

        with transaction.atomic():
            try:
                seq = NumberSequence.objects.select_for_update().get(name=sequence_name)
            except NumberSequence.DoesNotExist as e:
                raise ValueError(f"Number sequence '{sequence_name}' not found") from e

            # Check if counter needs reset (yearly)
            if seq.reset_period == NumberSequence.ResetPeriod.YEARLY and seq.last_reset_year < today.year:
                seq.current_value = 1
                seq.last_reset_year = today.year
                seq.save(update_fields=["current_value", "last_reset_year"])
            else:
                # Increment atomically
                seq.current_value = F("current_value") + 1
                seq.save(update_fields=["current_value"])
                seq.refresh_from_db()

            # Format the number
            return _format_number(seq.pattern, seq.prefix, seq.current_value, today)

    @staticmethod
    def current(sequence_name: str) -> int:
        """Get current counter value without incrementing."""
        try:
            return NumberSequence.objects.get(name=sequence_name).current_value
        except NumberSequence.DoesNotExist:
            return 0

    @staticmethod
    def preview(sequence_name: str) -> str:
        """Preview what the next number would look like."""
        today = date.today()
        try:
            seq = NumberSequence.objects.get(name=sequence_name)
            next_val = seq.current_value + 1
            if seq.reset_period == NumberSequence.ResetPeriod.YEARLY and seq.last_reset_year < today.year:
                next_val = 1
            return _format_number(seq.pattern, seq.prefix, next_val, today)
        except NumberSequence.DoesNotExist:
            return ""


def _format_number(pattern: str, prefix: str, value: int, today: date) -> str:
    """
    Format a number using the pattern template.

    Supported placeholders:
        {prefix}  — the prefix string
        {YYYY}    — 4-digit year
        {YY}      — 2-digit year
        {MM}      — 2-digit month
        {####}    — counter padded to 4 digits
        {######}  — counter padded to 6 digits
    """
    result = pattern
    result = result.replace("{prefix}", prefix)
    result = result.replace("{YYYY}", str(today.year))
    result = result.replace("{YY}", str(today.year)[-2:])
    result = result.replace("{MM}", f"{today.month:02d}")

    # Handle padding: {####} → 4 digits, {######} → 6 digits, etc.
    def replace_padding(match):
        hashes = match.group(0)
        padding = len(hashes) - 2  # subtract the braces
        return str(value).zfill(padding)

    result = re.sub(r"\{(#+)\}", lambda m: str(value).zfill(len(m.group(1))), result)

    return result
