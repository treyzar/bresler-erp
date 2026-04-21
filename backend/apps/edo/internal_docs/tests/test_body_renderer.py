"""Тесты body_renderer: гидрация значений + рендер через Django Template."""

from datetime import date

import pytest

from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.services.body_renderer import render_body
from apps.users.tests.factories import UserFactory


@pytest.fixture
def company(db):
    return OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")


@pytest.fixture
def dept(db, company):
    return Department.add_root(name="Отдел проектирования", unit_type="department", company=company)


# ---------- passthrough types ----------

@pytest.mark.django_db
def test_plain_text():
    author = UserFactory()
    out = render_body(
        "Привет, {{ subject }}",
        [{"name": "subject", "type": "text"}],
        {"subject": "мир"},
        author,
    )
    assert out == "Привет, мир"


@pytest.mark.django_db
def test_linebreaks_filter_for_markdown():
    author = UserFactory()
    out = render_body(
        "{{ body|linebreaks }}",
        [{"name": "body", "type": "markdown"}],
        {"body": "Первая строка\nВторая"},
        author,
    )
    assert "<br>" in out
    assert "Первая строка" in out


@pytest.mark.django_db
def test_number_and_money():
    """Django floatformat в ru_RU-локали использует запятую — это корректно для документа."""
    author = UserFactory()
    out = render_body(
        "{{ total|floatformat:2 }}",
        [{"name": "total", "type": "money"}],
        {"total": 12000.5},
        author,
    )
    assert out in ("12000.50", "12000,50")


# ---------- date / time / date_range ----------

@pytest.mark.django_db
def test_date_iso_string_hydrates_to_date_object():
    author = UserFactory()
    out = render_body(
        '{{ d|date:"d.m.Y" }}',
        [{"name": "d", "type": "date"}],
        {"d": "2026-04-21"},
        author,
    )
    assert out == "21.04.2026"


@pytest.mark.django_db
def test_time_hms_string():
    author = UserFactory()
    out = render_body(
        '{{ t|time:"H:i" }}',
        [{"name": "t", "type": "time"}],
        {"t": "09:30"},
        author,
    )
    assert out == "09:30"


@pytest.mark.django_db
def test_date_range_from_to():
    author = UserFactory()
    out = render_body(
        '{{ dr.from|date:"d.m.Y" }} – {{ dr.to|date:"d.m.Y" }}',
        [{"name": "dr", "type": "date_range"}],
        {"dr": {"from": "2026-04-21", "to": "2026-04-25"}},
        author,
    )
    assert out == "21.04.2026 – 25.04.2026"


# ---------- choice ----------

@pytest.mark.django_db
def test_choice_display_field():
    author = UserFactory()
    schema = [{
        "name": "work_type", "type": "choice",
        "choices": [["overtime", "В сверхурочное время"], ["weekend", "В выходной день"]],
    }]
    out = render_body("{{ work_type_display }}", schema, {"work_type": "overtime"}, author)
    assert out == "В сверхурочное время"


@pytest.mark.django_db
def test_choice_conditional_rendering():
    """Шаблон может делать {% if work_type == 'overtime' %}...{% endif %}."""
    author = UserFactory()
    schema = [{
        "name": "work_type", "type": "choice",
        "choices": [["overtime", "A"], ["weekend", "B"]],
    }]
    out = render_body(
        "{% if work_type == 'overtime' %}X{% else %}Y{% endif %}",
        schema, {"work_type": "overtime"}, author,
    )
    assert out == "X"


# ---------- user / user_multi ----------

@pytest.mark.django_db
def test_user_field_hydrates_to_instance():
    author = UserFactory()
    target = UserFactory(last_name="Петров", first_name="Иван", patronymic="Сергеевич")
    out = render_body(
        "{{ responsible.full_name_short }}",
        [{"name": "responsible", "type": "user"}],
        {"responsible": target.pk},
        author,
    )
    assert out == "Петров И. С."


@pytest.mark.django_db
def test_user_multi_preserves_order():
    author = UserFactory()
    u1 = UserFactory(last_name="Иванов")
    u2 = UserFactory(last_name="Абрамов")
    u3 = UserFactory(last_name="Сидоров")
    # Передаём именно в порядке u1, u2, u3.
    out = render_body(
        "{% for emp in employees %}{{ emp.last_name }},{% endfor %}",
        [{"name": "employees", "type": "user_multi"}],
        {"employees": [u1.pk, u2.pk, u3.pk]},
        author,
    )
    assert out == "Иванов,Абрамов,Сидоров,"


@pytest.mark.django_db
def test_user_missing_returns_empty():
    author = UserFactory()
    out = render_body(
        "{{ ref.full_name_short|default:'не задан' }}",
        [{"name": "ref", "type": "user"}],
        {"ref": None},
        author,
    )
    assert out == "не задан"


# ---------- orgunit / department ----------

@pytest.mark.django_db
def test_department_field(dept):
    author = UserFactory()
    out = render_body(
        "{{ addressee.name }}",
        [{"name": "addressee", "type": "department"}],
        {"addressee": dept.pk},
        author,
    )
    assert out == "Отдел проектирования"


@pytest.mark.django_db
def test_orgunit_field(company):
    author = UserFactory()
    out = render_body(
        "{{ customer.name }}",
        [{"name": "customer", "type": "orgunit"}],
        {"customer": company.pk},
        author,
    )
    assert out == "Релесофт"


# ---------- reserved context ----------

@pytest.mark.django_db
def test_reserved_author_variable():
    author = UserFactory(last_name="Васильев", first_name="Сергей", patronymic="Андреевич")
    out = render_body("{{ author.full_name_short }}", [], {}, author)
    assert out == "Васильев С. А."


@pytest.mark.django_db
def test_reserved_today_variable():
    from django.utils import timezone
    author = UserFactory()
    out = render_body('{{ today|date:"d.m.Y" }}', [], {}, author)
    assert out == timezone.localdate().strftime("%d.%m.%Y")


@pytest.mark.django_db
def test_fields_dict_accessible():
    author = UserFactory()
    out = render_body(
        "{{ fields.subject }}",
        [{"name": "subject", "type": "text"}],
        {"subject": "Тест"},
        author,
    )
    assert out == "Тест"


# ---------- full-document scenario: memo_overtime ----------

@pytest.mark.django_db
def test_memo_overtime_full_template(company, dept):
    author = UserFactory(last_name="Автор", first_name="А", patronymic="А", company_unit=company, department_unit=dept)
    responsible = UserFactory(last_name="Петров", first_name="И", patronymic="С", position="Начальник отдела")
    emp1 = UserFactory(last_name="Иванов", first_name="П", patronymic="А", position="Инженер")
    emp2 = UserFactory(last_name="Сидоров", first_name="М", patronymic="В", position="Техник")

    schema = [
        {"name": "work_type", "type": "choice",
         "choices": [["overtime", "в сверхурочное время"], ["weekend", "в выходной день"]]},
        {"name": "overtime_date", "type": "date"},
        {"name": "time_from", "type": "time"},
        {"name": "time_to", "type": "time"},
        {"name": "responsible", "type": "user"},
        {"name": "employees", "type": "user_multi"},
        {"name": "reason", "type": "textarea"},
    ]
    values = {
        "work_type": "overtime",
        "overtime_date": "2026-04-25",
        "time_from": "09:00",
        "time_to": "18:00",
        "responsible": responsible.pk,
        "employees": [emp1.pk, emp2.pk],
        "reason": "закрытие проекта",
    }
    template = (
        "Прошу разрешить выход работников {{ author.department_unit.name }} "
        "{% if work_type == 'overtime' %}в сверхурочное время{% else %}в выходной день{% endif %}\n"
        '{{ overtime_date|date:"d.m.Y" }} г. с {{ time_from|time:"H:i" }} до {{ time_to|time:"H:i" }} часов:\n'
        "{% for emp in employees %}    {{ forloop.counter }}. {{ emp.last_name }} {{ emp.first_name|slice:\"1\" }}. — {{ emp.position }}\n{% endfor %}"
        "Ответственный: {{ responsible.last_name }}, {{ responsible.position }}.\n"
        "{% if reason %}Обоснование: {{ reason }}{% endif %}"
    )
    out = render_body(template, schema, values, author)
    assert "Отдел проектирования" in out
    assert "в сверхурочное время" in out
    assert "25.04.2026" in out
    assert "09:00" in out and "18:00" in out
    assert "Иванов" in out and "Сидоров" in out
    assert "Петров, Начальник отдела" in out
    assert "Обоснование: закрытие проекта" in out


# ---------- edge cases ----------

@pytest.mark.django_db
def test_empty_template_returns_empty():
    author = UserFactory()
    assert render_body("", [], {}, author) == ""


@pytest.mark.django_db
def test_missing_field_renders_empty():
    author = UserFactory()
    out = render_body(
        "Value: [{{ missing }}]",
        [{"name": "existing", "type": "text"}],
        {},
        author,
    )
    assert out == "Value: []"


@pytest.mark.django_db
def test_autoescape_html():
    """Django авто-экранирует HTML в подставленных значениях."""
    author = UserFactory()
    out = render_body(
        "{{ body }}",
        [{"name": "body", "type": "text"}],
        {"body": "<script>alert(1)</script>"},
        author,
    )
    assert "&lt;script&gt;" in out
    assert "<script>" not in out


@pytest.mark.django_db
def test_default_filter_for_none():
    author = UserFactory()
    out = render_body(
        '{{ x|default:"fallback" }}',
        [{"name": "x", "type": "text"}],
        {"x": None},
        author,
    )
    assert out == "fallback"
