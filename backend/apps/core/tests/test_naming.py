"""Tests for NamingSeries."""

import pytest
from datetime import date
from unittest.mock import patch

from apps.core.naming import NamingService, NumberSequence, _format_number


@pytest.mark.django_db
class TestNumberSequence:
    def test_generate_basic(self):
        NumberSequence.objects.create(
            name="test", prefix="TST", pattern="{prefix}-{####}",
            current_value=0, reset_period="never",
        )
        result = NamingService.generate("test")
        assert result == "TST-0001"

    def test_generate_increments(self):
        NumberSequence.objects.create(
            name="test", prefix="TST", pattern="{prefix}-{####}",
            current_value=0, reset_period="never",
        )
        assert NamingService.generate("test") == "TST-0001"
        assert NamingService.generate("test") == "TST-0002"
        assert NamingService.generate("test") == "TST-0003"

    def test_generate_with_year(self):
        NumberSequence.objects.create(
            name="test", prefix="ORD", pattern="{prefix}-{YYYY}-{####}",
            current_value=0, reset_period="never",
        )
        result = NamingService.generate("test")
        year = date.today().year
        assert result == f"ORD-{year}-0001"

    def test_generate_with_short_year(self):
        NumberSequence.objects.create(
            name="test", prefix="ORD", pattern="{prefix}-{YY}-{######}",
            current_value=0, reset_period="never",
        )
        result = NamingService.generate("test")
        yy = str(date.today().year)[-2:]
        assert result == f"ORD-{yy}-000001"

    def test_generate_with_month(self):
        NumberSequence.objects.create(
            name="test", prefix="INV", pattern="{prefix}-{YYYY}{MM}-{####}",
            current_value=0, reset_period="never",
        )
        result = NamingService.generate("test")
        today = date.today()
        assert result == f"INV-{today.year}{today.month:02d}-0001"

    def test_yearly_reset(self):
        NumberSequence.objects.create(
            name="test", prefix="TST", pattern="{prefix}-{YYYY}-{####}",
            current_value=42, reset_period="yearly", last_reset_year=2025,
        )
        # Current year > 2025, so counter should reset
        result = NamingService.generate("test")
        year = date.today().year
        assert result == f"TST-{year}-0001"

    def test_no_reset_same_year(self):
        year = date.today().year
        NumberSequence.objects.create(
            name="test", prefix="TST", pattern="{prefix}-{####}",
            current_value=42, reset_period="yearly", last_reset_year=year,
        )
        result = NamingService.generate("test")
        assert result == "TST-0043"

    def test_never_reset(self):
        NumberSequence.objects.create(
            name="test", prefix="TST", pattern="{prefix}-{####}",
            current_value=42, reset_period="never", last_reset_year=2020,
        )
        result = NamingService.generate("test")
        assert result == "TST-0043"

    def test_generate_nonexistent_raises(self):
        with pytest.raises(ValueError, match="not found"):
            NamingService.generate("nonexistent")

    def test_current_value(self):
        NumberSequence.objects.create(name="test", prefix="T", current_value=5)
        assert NamingService.current("test") == 5

    def test_current_nonexistent(self):
        assert NamingService.current("nope") == 0

    def test_preview(self):
        NumberSequence.objects.create(
            name="test", prefix="ORD", pattern="{prefix}-{####}",
            current_value=10, reset_period="never",
        )
        assert NamingService.preview("test") == "ORD-0011"


class TestFormatNumber:
    def test_simple(self):
        assert _format_number("{prefix}-{####}", "ORD", 1, date(2026, 3, 28)) == "ORD-0001"

    def test_full_pattern(self):
        result = _format_number("{prefix}-{YYYY}-{MM}-{####}", "ДОГ", 42, date(2026, 3, 28))
        assert result == "ДОГ-2026-03-0042"

    def test_six_digit_padding(self):
        assert _format_number("{######}", "", 7, date(2026, 1, 1)) == "000007"
