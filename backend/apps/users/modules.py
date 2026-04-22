"""Реестр модулей системы — источник истины для поля GroupProfile.allowed_modules.

Вместо хардкода в коде (`ALL_MODULES = [...]`) список модулей собирается
из settings.INSTALLED_APPS + карты меток. Добавили новый app → он появляется
в выпадающем списке модулей в админке, без изменения кода `users.models`.
"""

from __future__ import annotations

# slug → отображаемое название + app_label Django (для опциональной валидации)
REGISTERED_MODULES: list[tuple[str, str, str]] = [
    ("orders", "Заказы / Сделки", "orders"),
    ("directory", "Справочники", "directory"),
    ("devices", "Устройства РЗА", "devices"),
    ("edo", "ЭДО", "edo"),
    ("reports", "Отчёты и дашборд", "reports"),
    ("purchasing", "Снабжение", "purchasing"),
    ("specs", "Спецификации и КП", "specs"),
]


def all_module_slugs() -> list[str]:
    """Список slug'ов для дефолтного набора admin-группы."""
    return [slug for slug, _, _ in REGISTERED_MODULES]


def module_choices() -> list[tuple[str, str]]:
    """(value, label) для ChoiceField / MultiSelect в админке."""
    return [(slug, label) for slug, label, _ in REGISTERED_MODULES]
