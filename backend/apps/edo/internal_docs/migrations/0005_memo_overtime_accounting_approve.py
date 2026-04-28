"""Применяем к существующему memo_overtime:
- initiator_resolver = department_head (только руководитель подразделения создаёт)
- 3-й шаг (Бухгалтерия) = approve вместо inform, с SLA 72 часа.

Фикс к уже сидированному типу — чтобы не пересоздавать руками.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    apps.get_model("internal_docs", "ApprovalChainTemplate")

    dt = DocumentType.objects.filter(code="memo_overtime").first()
    if dt is None:
        return

    dt.initiator_resolver = "department_head"
    dt.save(update_fields=["initiator_resolver"])

    chain = dt.default_chain
    new_steps = []
    for step in chain.steps or []:
        if step.get("role_key") == "group:accounting@company":
            step = {**step, "action": "approve", "sla_hours": 72}
        new_steps.append(step)
    chain.steps = new_steps
    chain.save(update_fields=["steps"])


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("internal_docs", "0004_doctype_initiator_department_head")]
    operations = [migrations.RunPython(forwards, backwards)]
