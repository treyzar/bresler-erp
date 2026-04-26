"""Серверный рендер body_template / title_template через Django Template Language.

Входные данные:
- template_str: строка шаблона (из DocumentType.body_template / .title_template).
- field_schema: список полей (DocumentType.field_schema) — по нему гидрируем значения.
- field_values: сырой JSON из Document.field_values (значения форм пользователя).
- author: User-автор.
- document: (опционально) Document instance — для `{{ document.number }}`, `{{ document.created_at }}`.

Гидрация по типу поля:
- text/textarea/markdown/number/money/boolean → pass through
- date/time → `date`/`time` объект, чтобы работали фильтры `|date`/`|time`
- date_range → {"from": date, "to": date}
- choice → значение остаётся кодом, но в context добавляется `<field>_display` с label
- user → User instance (или None, если не найден)
- user_multi → list[User]
- orgunit → OrgUnit instance
- department → Department instance

Reserved context: `author`, `today`, `document`, `fields` (плоский dict) + каждое поле по имени.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any

from django.template import Context, Template
from django.utils import timezone

logger = logging.getLogger(__name__)

FIELD_TYPES_PASSTHROUGH = {"text", "textarea", "markdown", "number", "money", "boolean", "file"}


def _parse_date(val: Any) -> date | None:
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str) and val:
        try:
            return date.fromisoformat(val[:10])
        except ValueError:
            return None
    return None


def _parse_time(val: Any) -> time | None:
    if isinstance(val, time):
        return val
    if isinstance(val, str) and val:
        try:
            return time.fromisoformat(val)
        except ValueError:
            # Fallback на HH:MM
            try:
                h, m = val.split(":", 1)
                return time(int(h), int(m[:2]))
            except (ValueError, IndexError):
                return None
    return None


def _resolve_user(val: Any):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None
    return User.objects.filter(pk=pk).first()


def _resolve_users(val: Any) -> list:
    if not isinstance(val, (list, tuple)):
        return []
    from django.contrib.auth import get_user_model
    User = get_user_model()
    pks = []
    for item in val:
        try:
            pks.append(int(item))
        except (TypeError, ValueError):
            continue
    if not pks:
        return []
    # Сохраняем порядок как во входном списке.
    users_by_pk = {u.pk: u for u in User.objects.filter(pk__in=pks)}
    return [users_by_pk[pk] for pk in pks if pk in users_by_pk]


def _resolve_orgunit(val: Any):
    from apps.directory.models import OrgUnit
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None
    return OrgUnit.objects.filter(pk=pk).first()


def _resolve_department(val: Any):
    from apps.directory.models import Department
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None
    return Department.objects.filter(pk=pk).first()


def _hydrate_table_rows(columns: list[dict], raw: Any) -> list[dict]:
    """Гидрирует строки таблицы по описанию колонок (см. schema.ALLOWED_COLUMN_TYPES).

    Каждая строка — dict с теми же ключами, что у колонок. Значения колонок
    типа user/orgunit/department/date/time подгружаются как объекты, чтобы
    в шаблоне можно было писать `{{ row.employee.full_name }}` и т.п.
    """
    if not isinstance(raw, list):
        return []
    rows: list[dict] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        hydrated_row: dict[str, Any] = {}
        for col in columns:
            if not isinstance(col, dict):
                continue
            cname = col.get("name")
            if not cname:
                continue
            ctype = col.get("type", "text")
            cval = row.get(cname)
            if ctype == "user":
                hydrated_row[cname] = _resolve_user(cval)
            elif ctype == "user_multi":
                hydrated_row[cname] = _resolve_users(cval)
            elif ctype == "orgunit":
                hydrated_row[cname] = _resolve_orgunit(cval)
            elif ctype == "department":
                hydrated_row[cname] = _resolve_department(cval)
            elif ctype == "date":
                hydrated_row[cname] = _parse_date(cval)
            elif ctype == "time":
                hydrated_row[cname] = _parse_time(cval)
            elif ctype == "date_range" and isinstance(cval, dict):
                hydrated_row[cname] = {
                    "from": _parse_date(cval.get("from")),
                    "to": _parse_date(cval.get("to")),
                }
            else:
                hydrated_row[cname] = cval
        rows.append(hydrated_row)
    return rows


def _build_context(
    field_schema: list[dict],
    field_values: dict,
    author,
    document=None,
    extra: dict | None = None,
) -> dict[str, Any]:
    """Собирает context для Template.render с гидрированными значениями."""
    hydrated: dict[str, Any] = {}

    for spec in field_schema or []:
        if not isinstance(spec, dict):
            continue
        name = spec.get("name")
        if not name:
            continue
        ftype = spec.get("type", "text")
        raw = field_values.get(name)

        if ftype in FIELD_TYPES_PASSTHROUGH:
            hydrated[name] = raw
        elif ftype == "date":
            hydrated[name] = _parse_date(raw)
        elif ftype == "time":
            hydrated[name] = _parse_time(raw)
        elif ftype == "date_range":
            if isinstance(raw, dict):
                hydrated[name] = {
                    "from": _parse_date(raw.get("from")),
                    "to": _parse_date(raw.get("to")),
                }
            else:
                hydrated[name] = {"from": None, "to": None}
        elif ftype == "choice":
            hydrated[name] = raw
            # <name>_display: ищем label из schema.choices
            label = raw
            for code, display in spec.get("choices") or []:
                if code == raw:
                    label = display
                    break
            hydrated[f"{name}_display"] = label
        elif ftype == "user":
            hydrated[name] = _resolve_user(raw)
        elif ftype == "user_multi":
            hydrated[name] = _resolve_users(raw)
        elif ftype == "orgunit":
            hydrated[name] = _resolve_orgunit(raw)
        elif ftype == "department":
            hydrated[name] = _resolve_department(raw)
        elif ftype == "table":
            hydrated[name] = _hydrate_table_rows(spec.get("columns") or [], raw)
        else:
            hydrated[name] = raw

    context: dict[str, Any] = {
        **hydrated,
        "fields": hydrated,
        "author": author,
        "today": timezone.localdate(),
        "document": document,
    }
    if extra:
        context.update(extra)
    return context


def render_body(
    template_str: str,
    field_schema: list[dict] | None,
    field_values: dict | None,
    author,
    document=None,
    extra_context: dict | None = None,
) -> str:
    """Главная точка: возвращает отрендеренный текст. Auto-escape Django включён."""
    if not template_str:
        return ""
    ctx = _build_context(
        field_schema or [],
        field_values or {},
        author,
        document=document,
        extra=extra_context,
    )
    tpl = Template(template_str)
    return tpl.render(Context(ctx))


def render_for_document(document, template_field: str = "body_template") -> str:
    """Удобная обёртка: рендерит поле шаблона (`body_template` или `title_template`)
    конкретного Document по его type.field_schema + field_values.
    """
    tpl_source = getattr(document.type, template_field, "") or ""
    return render_body(
        tpl_source,
        document.type.field_schema or [],
        document.field_values or {},
        author=document.author,
        document=document,
    )
