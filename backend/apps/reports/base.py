"""
Base report classes — inspired by ERPNext Script Report pattern.

Each report is a Python class with:
  - name, title: identification
  - filters: list of filter definitions
  - columns: list of column definitions
  - get_data(filters): returns queryset/list of dicts
  - chart_config: optional chart configuration
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FilterDef:
    """Report filter definition."""
    name: str
    label: str
    type: str = "text"  # text, date, select, date_range
    choices: list[tuple[str, str]] | None = None
    default: Any = None
    required: bool = False


@dataclass
class ColumnDef:
    """Report column definition."""
    name: str
    label: str
    type: str = "text"  # text, number, currency, percent, badge, date


@dataclass
class ChartConfig:
    """Chart configuration for report."""
    chart_type: str = "bar"  # bar, pie, line
    value_field: str = ""
    label_field: str = ""
    title: str = ""


class BaseReport:
    """Base class for all reports."""

    name: str = ""
    title: str = ""
    description: str = ""
    filters: list[FilterDef] = []
    columns: list[ColumnDef] = []
    chart: ChartConfig | None = None

    def get_data(self, filters: dict) -> list[dict]:
        """Execute report and return data rows."""
        raise NotImplementedError

    def get_meta(self) -> dict:
        """Return report metadata for the frontend."""
        return {
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "filters": [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.type,
                    "choices": f.choices,
                    "default": f.default,
                    "required": f.required,
                }
                for f in self.filters
            ],
            "columns": [
                {"name": c.name, "label": c.label, "type": c.type}
                for c in self.columns
            ],
            "chart": {
                "chart_type": self.chart.chart_type,
                "value_field": self.chart.value_field,
                "label_field": self.chart.label_field,
                "title": self.chart.title,
            } if self.chart else None,
        }
