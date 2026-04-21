"""Нормализация editor_content: миграция legacy "плоского" формата в {properties: {...}}.

Фронт раньше сохранял элементы в виде {id, type, x, y, w, h, content, isBold, ...},
без объекта properties. Рендер ожидает properties.* — поэтому старые шаблоны
падают в белый экран. Этот модуль приводит любой формат к каноничному.
"""
from __future__ import annotations

from typing import Any

TEXT_DEFAULTS: dict[str, Any] = {
    "fontFamily": "Inter",
    "fontSize": 14,
    "color": "#1a1a1a",
    "bold": False,
    "italic": False,
    "underline": False,
    "align": "left",
    "textIndent": 0,
    "lineHeight": 1.5,
    "letterSpacing": 0,
    "whiteSpace": "pre-wrap",
    "wordBreak": "break-word",
    "paragraphSpacing": 8,
}

DIVIDER_DEFAULTS: dict[str, Any] = {"thickness": 1, "color": "#1a1a1a", "style": "solid"}
SIGNATURE_DEFAULTS: dict[str, Any] = {"text": "Подпись", "fontSize": 16, "color": "#1a1a1a"}

_FLAT_KEYS = {
    "content", "text", "fontSize", "align", "underline", "color", "fontFamily",
    "src", "alt", "image", "columns", "cells", "rows", "cols", "data",
    "borderWidth", "borderColor", "cellBg", "thickness", "style",
}


def _hoist_flat_fields(element: dict[str, Any]) -> dict[str, Any]:
    """Переносит плоские поля в properties и подставляет дефолты по типу."""
    props: dict[str, Any] = {}
    el_type = element.get("type")

    for key in _FLAT_KEYS:
        if key in element:
            props[key] = element[key]

    if "isBold" in element:
        props["bold"] = bool(element["isBold"])
    if "isItalic" in element:
        props["italic"] = bool(element["isItalic"])
    if "bold" in element:
        props["bold"] = bool(element["bold"])
    if "italic" in element:
        props["italic"] = bool(element["italic"])

    if el_type == "text":
        for key, val in TEXT_DEFAULTS.items():
            props.setdefault(key, val)
        props.setdefault("content", "")
    elif el_type == "signature":
        for key, val in SIGNATURE_DEFAULTS.items():
            props.setdefault(key, val)
    elif el_type == "divider":
        for key, val in DIVIDER_DEFAULTS.items():
            props.setdefault(key, val)
    elif el_type == "image":
        props.setdefault("src", "")
        props.setdefault("alt", "")

    return props


def normalize_element(raw: Any) -> dict[str, Any] | None:
    """Приводит один элемент к каноничному виду. Возвращает None, если элемент невалидный."""
    if not isinstance(raw, dict) or not raw.get("type"):
        return None

    if isinstance(raw.get("properties"), dict):
        props = raw["properties"]
    else:
        props = _hoist_flat_fields(raw)

    def _to_int(v: Any, default: int) -> int:
        try:
            return int(round(float(v)))
        except (TypeError, ValueError):
            return default

    return {
        "id": str(raw.get("id") or ""),
        "type": raw["type"],
        "x": _to_int(raw.get("x"), 0),
        "y": _to_int(raw.get("y"), 0),
        "width": _to_int(raw.get("width"), 100),
        "height": _to_int(raw.get("height"), 40),
        "zIndex": _to_int(raw.get("zIndex"), 0),
        "properties": props,
    }


def normalize_editor_content(data: Any) -> list[dict[str, Any]]:
    """Нормализует весь список элементов. Невалидные — отбрасывает."""
    if not isinstance(data, list):
        return []
    result: list[dict[str, Any]] = []
    for el in data:
        normalized = normalize_element(el)
        if normalized is not None:
            result.append(normalized)
    return result
