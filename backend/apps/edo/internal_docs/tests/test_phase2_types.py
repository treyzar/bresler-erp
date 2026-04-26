"""Smoke-тесты на 5 типов из Фазы 2: ТЗ §6 + §15. Прогон каждого типа
через жизненный цикл create → submit → approve, проверка рендера тела.

Особое внимание:
- bonus_monthly/quarterly: type=table рендер;
- vacation_notification: обратный поток (initiator=accounting, sign-сотрудник, inform-supervisor);
- travel_estimate: requires_drawn_signature=True + multi-step approval.
"""

from __future__ import annotations

import pytest
from django.contrib.auth.models import Group

from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalStep,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.users.tests.factories import UserFactory


# ============== fixtures ==============


@pytest.fixture
def org_tree(db):
    company = OrgUnit.add_root(name="TestCo", unit_type="company", business_role="internal")
    dept = Department.add_root(name="ОтделТест", unit_type="department", company=company)
    sector = dept.add_child(name="СекторТест", unit_type="sector", company=company)
    return {"company": company, "dept": dept, "sector": sector}


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


@pytest.fixture
def people(org_tree, accounting_group):
    """Полный состав: автор-сотрудник, рук. сектора, рук. отдела (=директор для company_head),
    бухгалтер."""
    employee = UserFactory(
        last_name="Сотрудников", first_name="Степан", patronymic="Сергеевич",
        position="Инженер РЗА",
        company_unit=org_tree["company"], department_unit=org_tree["sector"],
    )
    sector_head = UserFactory(
        last_name="Секторов", first_name="Семён", patronymic="Сергеевич",
        position="Начальник сектора",
        company_unit=org_tree["company"], department_unit=org_tree["sector"],
        is_department_head=True,
    )
    dept_head = UserFactory(
        last_name="Отделов", first_name="Олег", patronymic="Олегович",
        position="Начальник отдела",
        company_unit=org_tree["company"], department_unit=org_tree["dept"],
        is_department_head=True,
    )
    company_head = UserFactory(
        last_name="Директоров", first_name="Дмитрий", patronymic="Дмитриевич",
        position="Директор",
        company_unit=org_tree["company"],
        is_department_head=True,
    )
    accountant = UserFactory(
        last_name="Бухгалтерова", first_name="Берта", patronymic="Борисовна",
        position="Главный бухгалтер",
        company_unit=org_tree["company"],
    )
    accountant.groups.add(accounting_group)
    return {
        "employee": employee,
        "sector_head": sector_head,
        "dept_head": dept_head,
        "company_head": company_head,
        "accountant": accountant,
    }


# ============== memo_bonus_monthly ==============


@pytest.mark.django_db
def test_memo_bonus_monthly_full_lifecycle(people, org_tree):
    """Премирование месяц: создаёт начальник сектора, цепочка рук → бух → директор."""
    dtype = DocumentType.objects.get(code="memo_bonus_monthly")
    initiator = people["sector_head"]  # руководитель подразделения
    employee = people["employee"]

    field_values = {
        "month": "2026-04-15",
        "employees_with_amounts": [
            {"employee": employee.pk, "amount": 5000, "reason": "Качественное закрытие проекта"},
            {"employee": initiator.pk, "amount": 3000, "reason": "Своевременная отчётность"},
        ],
        "total": 8000,
    }
    doc = svc.create_draft(author=initiator, doc_type=dtype, field_values=field_values)
    svc.submit(doc, initiator)
    doc.refresh_from_db()

    assert doc.status == Document.Status.PENDING
    assert doc.number.startswith("СЗ-ПРЕМ-М-")
    assert "Сотрудников" in doc.body_rendered  # из таблицы
    assert "5000,00" in doc.body_rendered  # ru-локаль: запятая, не точка
    assert "8000,00" in doc.body_rendered
    assert "Итого" in doc.body_rendered

    # Цепочка из 3 шагов; первый — рук подразделения (для sector_head это dept_head).
    steps = list(doc.steps.order_by("order"))
    assert len(steps) == 3
    assert steps[0].approver_id == people["dept_head"].pk  # supervisor of sector_head
    assert steps[1].role_key == "group:accounting@company"
    # company_head резолвится в dept_head если у компании только один is_department_head
    # на верхнем уровне; в этом тесте у нас явный company_head с department_unit=NULL.
    assert steps[2].approver_id == people["company_head"].pk

    # Прогоняем всю цепочку до APPROVED.
    svc.approve(doc, people["dept_head"], comment="ok")
    svc.approve(doc, people["accountant"], comment="ok")
    svc.approve(doc, people["company_head"], comment="ok")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


@pytest.mark.django_db
def test_memo_bonus_monthly_requires_dept_head_initiator(people, org_tree):
    """Обычный сотрудник (не is_department_head) не может создать премирование."""
    dtype = DocumentType.objects.get(code="memo_bonus_monthly")
    from django.core.exceptions import PermissionDenied
    with pytest.raises(PermissionDenied):
        svc.create_draft(
            author=people["employee"],  # обычный сотрудник
            doc_type=dtype,
            field_values={"month": "2026-04-15", "employees_with_amounts": [], "total": 0},
        )


# ============== memo_bonus_quarterly ==============


@pytest.mark.django_db
def test_memo_bonus_quarterly_renders_period_display(people):
    """choice→<name>_display корректно подставляется в title и body."""
    dtype = DocumentType.objects.get(code="memo_bonus_quarterly")
    initiator = people["sector_head"]
    field_values = {
        "period": "Q1",
        "year": 2026,
        "employees_with_amounts": [
            {"employee": people["employee"].pk, "amount": 10000, "reason": ""},
        ],
        "total": 10000,
    }
    doc = svc.create_draft(author=initiator, doc_type=dtype, field_values=field_values)
    svc.submit(doc, initiator)
    doc.refresh_from_db()

    assert "I квартал" in doc.title  # period_display
    assert "2026" in doc.title
    assert "I квартал 2026" in doc.body_rendered
    assert "10000,00" in doc.body_rendered


# ============== app_dayoff_unpaid ==============


@pytest.mark.django_db
def test_app_dayoff_unpaid_full_lifecycle(people):
    dtype = DocumentType.objects.get(code="app_dayoff_unpaid")
    field_values = {
        "date_range": {"from": "2026-05-12", "to": "2026-05-14"},
        "reason": "Семейные обстоятельства",
    }
    doc = svc.create_draft(author=people["employee"], doc_type=dtype, field_values=field_values)
    svc.submit(doc, people["employee"])
    doc.refresh_from_db()

    assert doc.number.startswith("ЗАЯВ-ОТГ-СВ-")
    assert "Семейные обстоятельства" in doc.body_rendered
    assert "12.05.2026" in doc.title
    assert "14.05.2026" in doc.title

    steps = list(doc.steps.order_by("order"))
    assert len(steps) == 2
    assert steps[0].approver_id == people["sector_head"].pk
    assert steps[1].role_key == "group:accounting@company"

    svc.approve(doc, people["sector_head"], comment="ok")
    svc.approve(doc, people["accountant"], comment="ok")
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED


# ============== vacation_notification (обратный поток) ==============


@pytest.mark.django_db
def test_vacation_notification_reverse_flow(people, accounting_group):
    """Создаёт бухгалтер → подписывает сам → подписывает сотрудник → inform-руководитель."""
    dtype = DocumentType.objects.get(code="vacation_notification")
    field_values = {
        "employee": people["employee"].pk,
        "start_date": "2026-07-01",
        "duration_days": 14,
        "vacation_type": "annual",
    }
    doc = svc.create_draft(
        author=people["accountant"],
        doc_type=dtype,
        field_values=field_values,
        addressee=people["employee"],
    )
    svc.submit(doc, people["accountant"])
    doc.refresh_from_db()

    assert doc.number.startswith("УВЕД-ОТП-")
    assert "Сотрудников" in doc.title
    assert "01.07.2026" in doc.title

    steps = list(doc.steps.order_by("order"))
    assert len(steps) == 3

    # Шаг 1 — author = accountant; sign.
    assert steps[0].role_key == "author"
    assert steps[0].approver_id == people["accountant"].pk
    assert steps[0].action == ApprovalStep.Action.SIGN
    assert steps[0].status == ApprovalStep.Status.PENDING

    # Шаг 2 — field_user:employee = employee; sign; пока WAITING.
    assert steps[1].role_key == "field_user:employee"
    assert steps[1].approver_id == people["employee"].pk
    assert steps[1].action == ApprovalStep.Action.SIGN
    assert steps[1].status == ApprovalStep.Status.WAITING

    # Шаг 3 — field_user_supervisor:employee = sector_head; inform; WAITING.
    assert steps[2].role_key == "field_user_supervisor:employee"
    assert steps[2].approver_id == people["sector_head"].pk
    assert steps[2].action == ApprovalStep.Action.INFORM

    # Бухгалтер подписывает.
    svc.approve(doc, people["accountant"], comment="оформлено")
    doc.refresh_from_db()
    # Шаг 2 должен активироваться.
    assert doc.steps.get(role_key="field_user:employee").status == ApprovalStep.Status.PENDING

    # Сотрудник расписывается.
    svc.approve(doc, people["employee"], comment="ознакомлен")
    doc.refresh_from_db()
    # Inform-шаг автоматически закрылся, документ APPROVED.
    assert doc.status == Document.Status.APPROVED
    assert doc.steps.get(role_key="field_user_supervisor:employee").status == ApprovalStep.Status.APPROVED


@pytest.mark.django_db
def test_vacation_notification_initiator_must_be_accounting(people):
    dtype = DocumentType.objects.get(code="vacation_notification")
    from django.core.exceptions import PermissionDenied
    with pytest.raises(PermissionDenied):
        svc.create_draft(
            author=people["employee"],  # не в accounting
            doc_type=dtype,
            field_values={"employee": people["employee"].pk, "start_date": "2026-07-01",
                          "duration_days": 14, "vacation_type": "annual"},
        )


# ============== travel_estimate ==============


@pytest.mark.django_db
def test_travel_estimate_full_lifecycle(people):
    dtype = DocumentType.objects.get(code="travel_estimate")
    assert dtype.requires_drawn_signature is True

    field_values = {
        "destination_city": "Санкт-Петербург",
        "purpose": "Шеф-монтаж РЗА на ПС",
        "date_range": {"from": "2026-06-01", "to": "2026-06-05"},
        "transport_cost": 8500,
        "lodging_cost": 12000,
        "per_diem": 4900,  # 700×7 — frontend пересчитает
        "total": 25400,
        "advance_requested": True,
    }
    doc = svc.create_draft(author=people["employee"], doc_type=dtype, field_values=field_values)
    svc.submit(doc, people["employee"])
    doc.refresh_from_db()

    assert doc.number.startswith("КОМАНД-СМЕТА-")
    assert "Санкт-Петербург" in doc.title
    assert "Шеф-монтаж" in doc.body_rendered
    assert "25400,00" in doc.body_rendered
    assert "Запрашиваю выдачу аванса" in doc.body_rendered

    steps = list(doc.steps.order_by("order"))
    assert len(steps) == 3
    assert steps[0].approver_id == people["sector_head"].pk
    assert steps[1].role_key == "group:accounting@company"
    assert steps[2].action == ApprovalStep.Action.SIGN  # директор подписывает (sign)

    svc.approve(doc, people["sector_head"], comment="ok")
    svc.approve(doc, people["accountant"], comment="бюджет утверждён")
    svc.approve(
        doc, people["company_head"], comment="одобрено",
        signature_image="data:image/png;base64,iVBORw0KGgo=",
    )
    doc.refresh_from_db()
    assert doc.status == Document.Status.APPROVED
    final_step = doc.steps.get(role_key="company_head")
    assert final_step.signature_image.startswith("data:image/png")


# ============== schema validation ==============


@pytest.mark.django_db
def test_seeded_types_pass_schema_validation():
    """Все 5 новых типов должны проходить валидатор field_schema."""
    codes = [
        "memo_bonus_monthly", "memo_bonus_quarterly",
        "app_dayoff_unpaid", "vacation_notification", "travel_estimate",
    ]
    for c in codes:
        dt = DocumentType.objects.get(code=c)
        # full_clean прогонит JSONField validators=[validate_field_schema]
        dt.full_clean()


@pytest.mark.django_db
def test_table_field_validates_columns():
    """Поле type=table требует columns; валидатор бросает на пустые/невалидные."""
    from django.core.exceptions import ValidationError
    from apps.edo.internal_docs.services.schema import validate_field_schema

    validate_field_schema([{
        "name": "rows", "type": "table",
        "columns": [
            {"name": "user", "type": "user", "label": "Пользователь"},
            {"name": "amount", "type": "money", "label": "Сумма"},
        ],
    }])

    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "rows", "type": "table"}])  # no columns
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "rows", "type": "table",
                                "columns": [{"name": "x", "type": "table"}]}])  # nested table
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "x", "type": "text", "columns": []}])  # columns on non-table
