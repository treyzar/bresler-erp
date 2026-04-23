"""Обновление body_template типа memo_overtime: убираем лишние запятые/тире
при пустых polях patronymic / position. Использует тот же текст, что в
обновлённой 0002_seed_mvp_types (новые типы в коде уже корректные).
"""

from django.db import migrations


NEW_BODY_TEMPLATE = (
    "Прошу разрешить выход работников "
    "{{ author.department|default:author.company }} "
    "{% if work_type == 'overtime' %}в сверхурочное время"
    "{% else %}в выходной день{% endif %}\n"
    '{{ overtime_date|date:"d.m.Y" }} г. '
    'с {{ time_from|time:"H:i" }} до {{ time_to|time:"H:i" }} часов по списку:\n\n'
    "{% for emp in employees %}    {{ forloop.counter }}. "
    "{{ emp.last_name }} {{ emp.first_name|slice:':1' }}."
    "{% if emp.patronymic %} {{ emp.patronymic|slice:':1' }}.{% endif %}"
    "{% if emp.position %} — {{ emp.position }}{% endif %}\n"
    "{% endfor %}\n"
    "Ответственным за организацию труда, контроль за осуществлением работ, "
    "дисциплиной труда и соблюдением ОТ в это время назначается:\n\n"
    "    {{ responsible.last_name }} "
    "{{ responsible.first_name|slice:':1' }}."
    "{% if responsible.patronymic %} {{ responsible.patronymic|slice:':1' }}.{% endif %}"
    "{% if responsible.position %}, {{ responsible.position }}{% endif %}.\n"
    "{% if reason %}\nОбоснование: {{ reason }}\n{% endif %}"
)


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    DocumentType.objects.filter(code="memo_overtime").update(body_template=NEW_BODY_TEMPLATE)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [("internal_docs", "0002_seed_mvp_types")]

    operations = [migrations.RunPython(forwards, backwards)]
