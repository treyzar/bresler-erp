"""Замена `author.position/department/company/...` → `assignment.*` в seed-шаблонах.

После Assignment-рефакторинга шаблоны body_template/title_template должны
рендериться в контексте конкретного штатного назначения автора (он мог
подать документ с одной из нескольких своих позиций). В рендер-контекст
теперь передаётся переменная `assignment` — обновляем существующие
DocumentType-шаблоны в БД, чтобы они использовали её, а не атрибуты автора.

Изменения по типам подстановок:
- `author.department` (строка-имя primary) → `assignment.department.name`
- `author.company` (строка-имя primary) → `assignment.company.name`
- `author.department_unit.name` → `assignment.department.name`
- `author.company_unit.name` → `assignment.company.name`

Прочие author.first_name/last_name/full_name/phone остаются user-level — их не трогаем.
"""

from django.db import migrations

REPLACEMENTS = [
    ("author.department_unit.name", "assignment.department.name"),
    ("author.company_unit.name", "assignment.company.name"),
    # Замена возможной подстановки {{ author.department }} (строкой) — после
    # author.department_unit.name, чтобы не задеть department_unit.
    ("author.department", "assignment.department.name"),
    ("author.company", "assignment.company.name"),
]


def _migrate_template(text: str) -> str:
    if not text:
        return text
    out = text
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    return out


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    updated = 0
    for dt in DocumentType.objects.all():
        new_body = _migrate_template(dt.body_template or "")
        new_title = _migrate_template(dt.title_template or "")
        if new_body != (dt.body_template or "") or new_title != (dt.title_template or ""):
            dt.body_template = new_body
            dt.title_template = new_title
            dt.save(update_fields=["body_template", "title_template"])
            updated += 1
    if updated:
        print(f"Migrated {updated} DocumentType template(s) to assignment-aware rendering")


def backwards(apps, schema_editor):
    """Обратная замена. Корректна только если шаблоны не редактировались
    после миграции — иначе возможны false-positive."""
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    reverse = [(new, old) for old, new in REPLACEMENTS]
    for dt in DocumentType.objects.all():
        text_b = dt.body_template or ""
        text_t = dt.title_template or ""
        for old, new in reverse:
            text_b = text_b.replace(old, new)
            text_t = text_t.replace(old, new)
        if text_b != (dt.body_template or "") or text_t != (dt.title_template or ""):
            dt.body_template = text_b
            dt.title_template = text_t
            dt.save(update_fields=["body_template", "title_template"])


class Migration(migrations.Migration):
    dependencies = [
        ("internal_docs", "0013_backfill_author_assignment"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
