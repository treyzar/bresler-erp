"""Валидация структуры `DocumentType.field_schema`.

Лёгкий формат (см. ТЗ §4.2 + §15.0): список словарей с обязательными `name`/`type`,
опциональными `label`, `required`, `choices`, `filter`, `placeholder`, `help_text`.
Используется и моделью (через field validator), и data-миграциями сидеров,
и админкой (через ModelForm.full_clean).
"""

from __future__ import annotations

from collections.abc import Iterable

from django.core.exceptions import ValidationError

ALLOWED_FIELD_TYPES = frozenset({
    "text", "textarea", "markdown",
    "number", "money",
    "date", "date_range", "time",
    "boolean", "choice",
    "user", "user_multi",
    "orgunit", "department",
    "file",
    "table",
})

# Внутри type=table колонки могут быть только простыми (без вложенных таблиц).
ALLOWED_COLUMN_TYPES = ALLOWED_FIELD_TYPES - {"table"}

ALLOWED_KEYS = frozenset({
    "name", "label", "type", "required",
    "choices", "filter", "placeholder", "help_text",
    "columns",
})


def _is_identifier(name: str) -> bool:
    """Имя поля должно быть валидным Python/JS-идентификатором — оно идёт в шаблон как `{{ name }}`."""
    return isinstance(name, str) and name.isidentifier()


def validate_field_schema(value) -> None:
    """Django field validator: бросает ValidationError при некорректной схеме.

    Назначение — поймать опечатки/пропуски в `field_schema` на этапе сохранения
    `DocumentType` (admin, ModelForm, full_clean), а также в data-миграциях сидеров.
    """
    if value in (None, "", []):
        return  # Пустая схема допустима — например, для уведомлений с фиксированным телом.
    if not isinstance(value, list):
        raise ValidationError("field_schema must be a list")

    seen_names: set[str] = set()
    errors: list[str] = []

    for idx, spec in enumerate(value):
        prefix = f"field[{idx}]"
        if not isinstance(spec, dict):
            errors.append(f"{prefix}: must be a dict, got {type(spec).__name__}")
            continue

        unknown = set(spec.keys()) - ALLOWED_KEYS
        if unknown:
            errors.append(f"{prefix}: unknown keys {sorted(unknown)}")

        name = spec.get("name")
        if not name:
            errors.append(f"{prefix}: 'name' is required")
        elif not _is_identifier(name):
            errors.append(f"{prefix}: name {name!r} is not a valid identifier")
        elif name in seen_names:
            errors.append(f"{prefix}: duplicate field name {name!r}")
        else:
            seen_names.add(name)

        ftype = spec.get("type")
        if not ftype:
            errors.append(f"{prefix}: 'type' is required")
        elif ftype not in ALLOWED_FIELD_TYPES:
            errors.append(
                f"{prefix}: type {ftype!r} not allowed "
                f"(must be one of {sorted(ALLOWED_FIELD_TYPES)})"
            )

        if "required" in spec and not isinstance(spec["required"], bool):
            errors.append(f"{prefix}: 'required' must be bool")

        if ftype == "choice":
            choices = spec.get("choices")
            if not isinstance(choices, list) or not choices:
                errors.append(f"{prefix}: type=choice requires non-empty 'choices' list")
            else:
                for ci, c in enumerate(choices):
                    if (
                        not isinstance(c, (list, tuple))
                        or len(c) != 2
                        or not isinstance(c[0], str)
                        or not isinstance(c[1], str)
                    ):
                        errors.append(f"{prefix}.choices[{ci}]: must be [code, label] pair of strings")
                        break
        elif "choices" in spec:
            errors.append(f"{prefix}: 'choices' only allowed for type=choice")

        if ftype == "table":
            columns = spec.get("columns")
            if not isinstance(columns, list) or not columns:
                errors.append(f"{prefix}: type=table requires non-empty 'columns' list")
            else:
                col_names: set[str] = set()
                for ci, col in enumerate(columns):
                    cprefix = f"{prefix}.columns[{ci}]"
                    if not isinstance(col, dict):
                        errors.append(f"{cprefix}: must be a dict")
                        continue
                    cname = col.get("name")
                    ctype = col.get("type")
                    if not cname or not _is_identifier(cname):
                        errors.append(f"{cprefix}: invalid name {cname!r}")
                    elif cname in col_names:
                        errors.append(f"{cprefix}: duplicate column name {cname!r}")
                    else:
                        col_names.add(cname)
                    if not ctype:
                        errors.append(f"{cprefix}: 'type' is required")
                    elif ctype not in ALLOWED_COLUMN_TYPES:
                        errors.append(
                            f"{cprefix}: type {ctype!r} not allowed inside table "
                            f"(must be one of {sorted(ALLOWED_COLUMN_TYPES)})"
                        )
                    label = col.get("label")
                    if label is not None and not isinstance(label, str):
                        errors.append(f"{cprefix}: 'label' must be a string")
        elif "columns" in spec:
            errors.append(f"{prefix}: 'columns' only allowed for type=table")

        if "filter" in spec and not isinstance(spec["filter"], dict):
            errors.append(f"{prefix}: 'filter' must be a dict")

        for str_key in ("label", "placeholder", "help_text"):
            v = spec.get(str_key)
            if v is not None and not isinstance(v, str):
                errors.append(f"{prefix}: {str_key!r} must be a string")

    if errors:
        raise ValidationError(errors)


def coerce_iterable(value) -> Iterable[dict]:
    """Безопасный итератор для рендера/админки — отбрасывает не-dict записи."""
    if not isinstance(value, list):
        return []
    return [s for s in value if isinstance(s, dict)]
