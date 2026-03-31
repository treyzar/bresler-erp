"""
Report registry — auto-discovers and stores all report classes.
"""

from apps.reports.base import BaseReport

_registry: dict[str, BaseReport] = {}


def register(report_class: type[BaseReport]) -> type[BaseReport]:
    """Decorator to register a report class."""
    instance = report_class()
    _registry[instance.name] = instance
    return report_class


def get_report(name: str) -> BaseReport | None:
    return _registry.get(name)


def get_all_reports() -> list[BaseReport]:
    return list(_registry.values())


def discover():
    """Import all report modules to trigger @register decorators."""
    import apps.reports.reports  # noqa: F401
