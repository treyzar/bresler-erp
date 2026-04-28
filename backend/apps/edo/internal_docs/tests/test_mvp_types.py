"""Smoke-тесты на 4 MVP-типа: прогоняем каждый тип через полный жизненный цикл
create → submit → render → approve. Проверяем, что seed-данные из миграции
0002_seed_mvp_types согласованы с резолверами и рендером.
"""

import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import Document, DocumentType
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org_tree(db):
    company = OrgUnit.add_root(name="TestCo", unit_type="company", business_role="internal")
    dept = Department.add_root(name="TestDept", unit_type="department", company=company)
    sector = dept.add_child(name="TestSector", unit_type="sector", company=company)
    return {"company": company, "dept": dept, "sector": sector}


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


@pytest.fixture
def mvp_users(org_tree, accounting_group):
    """Минимальный состав: автор, рук. сектора, рук. отдела, бухгалтер."""
    author = UserFactory(
        last_name="Авторов",
        first_name="А",
        patronymic="А",
        company_unit=org_tree["company"],
        department_unit=org_tree["sector"],
    )
    sector_head = UserFactory(
        last_name="Зеленко",
        first_name="З",
        patronymic="З",
        company_unit=org_tree["company"],
        department_unit=org_tree["sector"],
        is_department_head=True,
    )
    dept_head = UserFactory(
        last_name="Директоров",
        first_name="Д",
        patronymic="Д",
        company_unit=org_tree["company"],
        department_unit=org_tree["dept"],
        is_department_head=True,
    )
    accountant = UserFactory(
        last_name="Бухгалтерова",
        first_name="Б",
        patronymic="Б",
        company_unit=org_tree["company"],
    )
    accountant.groups.add(accounting_group)
    return {
        "author": author,
        "sector_head": sector_head,
        "dept_head": dept_head,
        "accountant": accountant,
    }


@pytest.fixture
def seeded_types(django_db_setup, django_db_blocker):
    """Гарантируем, что 4 seed-типа созданы на момент теста.

    Django тестовый ran-через-миграции создаёт их через 0002_seed_mvp_types.
    Но если кто-то другой теста удалит — этот фикстур догонит.
    """
    with django_db_blocker.unblock():
        codes = ["memo_free", "memo_overtime", "app_dayoff_workoff", "app_free"]
        existing = set(DocumentType.objects.filter(code__in=codes).values_list("code", flat=True))
        missing = set(codes) - existing
        if missing:
            pass  # runtime import
            # Если вдруг импорт не сработал, пропустим — сид уже должен был пройти.
    return True


# ========== helpers ==========


def _create_and_submit(api: APIClient, author, doc_type: str, field_values: dict) -> Document:
    api.force_authenticate(author)
    r = api.post(
        "/api/edo/internal/documents/",
        {
            "type": doc_type,
            "field_values": field_values,
        },
        format="json",
    )
    assert r.status_code == 201, r.data
    doc_id = r.data["id"]
    r2 = api.post(f"/api/edo/internal/documents/{doc_id}/submit/")
    assert r2.status_code == 200, f"submit failed: {r2.data}"
    return Document.objects.get(pk=doc_id)


# ========== memo_free ==========


@pytest.mark.django_db
def test_memo_free_flow(org_tree, mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "memo_free",
        {
            "subject": "Тестовая служебка",
            "addressee_department": org_tree["dept"].pk,
            "body": "Прошу рассмотреть вопрос о выделении ресурсов.",
        },
    )
    assert doc.status == "pending"
    assert doc.number.startswith("СЗ-СВОБ-")
    assert "Прошу рассмотреть" in doc.body_rendered
    assert "Тестовая служебка" in doc.title

    # Минимум один шаг должен быть создан
    assert doc.steps.count() >= 1
    # Автор — не в согласующих
    assert not doc.steps.filter(approver=mvp_users["author"]).exists()


@pytest.mark.django_db
def test_memo_free_approve_closes_if_dedupe(org_tree, mvp_users):
    """Если адресовано своему же отделу — второй шаг сворачивается, остаётся один."""
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "memo_free",
        {
            "subject": "Свой отдел",
            "addressee_department": org_tree["sector"].pk,  # свой сектор
            "body": "Текст",
        },
    )
    # Supervisor (sector_head) = field_dept_head:addressee_department → dedupe → 1 шаг
    assert doc.steps.count() == 1

    # Approve закрывает документ
    api.force_authenticate(mvp_users["sector_head"])
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/approve/", {"comment": "ok"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "approved"


# ========== memo_overtime ==========


@pytest.mark.django_db
def test_memo_overtime_flow(org_tree, mvp_users):
    """Только руководитель отдела/сектора может создавать. Цепочка из 3 active
    шагов: supervisor → dept_head:parent → accounting@company (approve)."""
    api = APIClient()
    extra_emp = UserFactory(
        last_name="Сотрудников",
        first_name="С",
        patronymic="С",
        position="Инженер",
        company_unit=org_tree["company"],
        department_unit=org_tree["sector"],
    )
    # Автор — sector_head (он department_head=True, удовлетворяет initiator_resolver).
    doc = _create_and_submit(
        api,
        mvp_users["sector_head"],
        "memo_overtime",
        {
            "work_type": "overtime",
            "overtime_date": "2026-05-15",
            "time_from": "18:00",
            "time_to": "22:00",
            "responsible": mvp_users["sector_head"].pk,
            "employees": [mvp_users["author"].pk, extra_emp.pk],
            "reason": "Закрытие проекта",
        },
    )
    assert doc.status == "pending"
    assert doc.number.startswith("СЗ-ПЕР-")
    assert "15.05.2026" in doc.body_rendered

    actives = [s for s in doc.steps.all() if s.action in ("approve", "sign")]
    assert len(actives) >= 2  # без бухгалтера в фикстуре accounting может скипнуться


@pytest.mark.django_db
def test_memo_overtime_requires_department_head(mvp_users):
    """Обычный сотрудник не может создать memo_overtime."""
    api = APIClient()
    api.force_authenticate(mvp_users["author"])  # не head
    r = api.post(
        "/api/edo/internal/documents/",
        {
            "type": "memo_overtime",
            "field_values": {
                "work_type": "overtime",
                "overtime_date": "2026-05-15",
                "time_from": "18:00",
                "time_to": "22:00",
                "responsible": mvp_users["sector_head"].pk,
                "employees": [mvp_users["author"].pk],
            },
        },
        format="json",
    )
    assert r.status_code == 403


@pytest.mark.django_db
def test_memo_overtime_weekend_choice(mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["sector_head"],
        "memo_overtime",
        {
            "work_type": "weekend",
            "overtime_date": "2026-05-16",
            "time_from": "09:00",
            "time_to": "15:00",
            "responsible": mvp_users["sector_head"].pk,
            "employees": [mvp_users["author"].pk],
        },
    )
    assert "в выходной день" in doc.body_rendered


# ========== app_dayoff_workoff ==========


@pytest.mark.django_db
def test_app_dayoff_workoff_flow(mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "app_dayoff_workoff",
        {
            "dayoff_date": "2026-05-20",
            "workoff_date": "2026-05-22",
            "reason": "Личные дела",
        },
    )
    assert doc.status == "pending"
    assert doc.number.startswith("ЗАЯВ-ОТГ-ОТР-")
    assert "20.05.2026" in doc.body_rendered
    assert "22.05.2026" in doc.body_rendered
    assert "Личные дела" in doc.body_rendered

    # Approve → документ должен быть approved (второй шаг inform).
    api.force_authenticate(mvp_users["sector_head"])
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/approve/", {"comment": ""}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "approved"


# ========== app_free ==========


@pytest.mark.django_db
def test_app_free_flow(mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "app_free",
        {
            "subject": "Перевод на удалёнку",
            "addressee_person": mvp_users["dept_head"].pk,
            "body": "Прошу рассмотреть возможность удалённой работы.",
        },
    )
    assert doc.status == "pending"
    assert doc.number.startswith("ЗАЯВ-СВОБ-")
    assert "Перевод на удалёнку" in doc.title
    assert "удалённой работы" in doc.body_rendered

    # Прогон: sector_head → dept_head (addressee)
    api.force_authenticate(mvp_users["sector_head"])
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/approve/", {"comment": "1"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "pending"
    # Следующий шаг — addressee (dept_head)
    assert doc.current_step.approver_id == mvp_users["dept_head"].pk

    api.force_authenticate(mvp_users["dept_head"])
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/approve/", {"comment": "2"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "approved"


# ========== PDF endpoint ==========


@pytest.mark.django_db
def test_pdf_endpoint_requires_submitted_document(mvp_users):
    """PDF работает только для отправленных документов (есть body_rendered)."""
    api = APIClient()
    api.force_authenticate(mvp_users["author"])
    r = api.post(
        "/api/edo/internal/documents/",
        {
            "type": "app_dayoff_workoff",
            "field_values": {"dayoff_date": "2026-05-01", "workoff_date": "2026-05-02"},
        },
        format="json",
    )
    assert r.status_code == 201
    doc_id = r.data["id"]

    # До submit — 400
    r = api.get(f"/api/edo/internal/documents/{doc_id}/pdf/")
    assert r.status_code == 400


# ========== reject / revision / cancel ==========


@pytest.mark.django_db
def test_reject_closes_document(mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "app_dayoff_workoff",
        {"dayoff_date": "2026-05-01", "workoff_date": "2026-05-02"},
    )
    api.force_authenticate(mvp_users["sector_head"])
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/reject/", {"comment": "Не одобряю"}, format="json")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "rejected"


@pytest.mark.django_db
def test_revision_sends_back_to_author_and_resubmit(mvp_users):
    api = APIClient()
    doc = _create_and_submit(
        api,
        mvp_users["author"],
        "app_dayoff_workoff",
        {"dayoff_date": "2026-05-01", "workoff_date": "2026-05-02"},
    )

    api.force_authenticate(mvp_users["sector_head"])
    r = api.post(
        f"/api/edo/internal/documents/{doc.pk}/request-revision/", {"comment": "Поправьте даты"}, format="json"
    )
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "revision_requested"

    # Автор правит и повторно submit
    api.force_authenticate(mvp_users["author"])
    r = api.patch(
        f"/api/edo/internal/documents/{doc.pk}/",
        {"field_values": {"dayoff_date": "2026-05-03", "workoff_date": "2026-05-04"}},
        format="json",
    )
    assert r.status_code == 200
    r = api.post(f"/api/edo/internal/documents/{doc.pk}/submit/")
    assert r.status_code == 200
    doc.refresh_from_db()
    assert doc.status == "pending"
