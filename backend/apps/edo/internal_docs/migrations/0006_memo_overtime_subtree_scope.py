"""Поле `responsible` и `employees` в memo_overtime скоупим к моему поддереву.

Раньше responsible был filter={is_department_head: True} — нельзя было выбрать
себя или коллегу-не-руководителя; employees вообще без фильтра — выпадало
все 419 сотрудников. Теперь оба фильтруются по поддереву department_unit
автора (включая его самого).
"""

from django.db import migrations


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    dt = DocumentType.objects.filter(code="memo_overtime").first()
    if dt is None:
        return
    new_schema = []
    for spec in (dt.field_schema or []):
        if not isinstance(spec, dict):
            new_schema.append(spec)
            continue
        if spec.get("name") == "responsible":
            spec = {**spec, "filter": {"scope": "subtree"},
                    "help_text": "Сотрудник вашего подразделения (или вы сами)"}
        elif spec.get("name") == "employees":
            spec = {**spec, "filter": {"scope": "subtree"},
                    "help_text": "Сотрудники вашего подразделения и подчинённых ему секторов"}
        new_schema.append(spec)
    dt.field_schema = new_schema
    dt.save(update_fields=["field_schema"])


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [("internal_docs", "0005_memo_overtime_accounting_approve")]
    operations = [migrations.RunPython(forwards, backwards)]
