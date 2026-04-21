"""Тесты рефакторинга User: org_unit, supervisor, full_name_short, company_root."""

import pytest

from apps.directory.models.orgunit import OrgUnit
from apps.users.models import User
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org_tree(db):
    """Строим тестовое дерево: Релесофт → Служба РЗА → Отдел 1 → Сектор А."""
    company = OrgUnit.add_root(
        name="Релесофт", unit_type="company", business_role="internal", is_legal_entity=True,
    )
    service = company.add_child(name="Служба РЗА", unit_type="service", business_role="internal")
    department = service.add_child(name="Отдел РЗА 1", unit_type="department", business_role="internal")
    sector = department.add_child(name="Сектор А", unit_type="sector", business_role="internal")
    return {
        "company": company,
        "service": service,
        "department": department,
        "sector": sector,
    }


@pytest.mark.django_db
def test_full_name_short():
    user = UserFactory(last_name="Васильев", first_name="Сергей", patronymic="Андреевич")
    assert user.full_name_short == "Васильев С. А."


@pytest.mark.django_db
def test_full_name_short_without_patronymic():
    user = UserFactory(last_name="Иванов", first_name="Иван", patronymic="")
    assert user.full_name_short == "Иванов И."


@pytest.mark.django_db
def test_company_root_from_sector(org_tree):
    user = UserFactory(org_unit=org_tree["sector"])
    user.refresh_from_db()
    assert user.company_root is not None
    assert user.company_root.pk == org_tree["company"].pk


@pytest.mark.django_db
def test_company_root_none_if_no_org_unit():
    user = UserFactory(org_unit=None)
    assert user.company_root is None


@pytest.mark.django_db
def test_resolve_supervisor_via_explicit_fk(org_tree):
    boss = UserFactory(org_unit=org_tree["department"])
    employee = UserFactory(org_unit=org_tree["sector"], supervisor=boss)
    assert employee.resolve_supervisor().pk == boss.pk


@pytest.mark.django_db
def test_resolve_supervisor_via_sector_head(org_tree):
    sector_head = UserFactory(org_unit=org_tree["sector"], is_department_head=True)
    employee = UserFactory(org_unit=org_tree["sector"])
    assert employee.resolve_supervisor().pk == sector_head.pk


@pytest.mark.django_db
def test_resolve_supervisor_walks_up_the_tree(org_tree):
    """Если head своего сектора нет — идём к head отдела, потом службы, потом компании."""
    dept_head = UserFactory(org_unit=org_tree["department"], is_department_head=True)
    employee = UserFactory(org_unit=org_tree["sector"])  # нет head в секторе
    assert employee.resolve_supervisor().pk == dept_head.pk


@pytest.mark.django_db
def test_resolve_supervisor_skips_self_even_if_head(org_tree):
    """Сам для себя руководителем быть не может — скипается, ищется дальше."""
    dept_head = UserFactory(org_unit=org_tree["department"], is_department_head=True)
    sector_head = UserFactory(org_unit=org_tree["sector"], is_department_head=True)
    # Для sector_head — его непосредственный руководитель dept_head (он сам head своего сектора,
    # но для СЕБЯ не считается; ищется выше).
    assert sector_head.resolve_supervisor().pk == dept_head.pk


@pytest.mark.django_db
def test_resolve_supervisor_returns_none_without_chain():
    employee = UserFactory(org_unit=None, supervisor=None)
    assert employee.resolve_supervisor() is None


@pytest.mark.django_db
def test_legacy_department_populated_from_org_unit_signal(org_tree):
    """pre_save-сигнал синхронизирует legacy-поля department/company из org_unit."""
    user = UserFactory(org_unit=org_tree["sector"])
    user.refresh_from_db()
    assert user.department == "Сектор А"
    assert user.company == "Релесофт"


@pytest.mark.django_db
def test_legacy_fields_preserved_without_org_unit():
    """Без org_unit сигнал не трогает — legacy-значения остаются как есть."""
    user = UserFactory(org_unit=None, department="Старый отдел", company="Старая компания")
    user.refresh_from_db()
    assert user.department == "Старый отдел"
    assert user.company == "Старая компания"


@pytest.mark.django_db
def test_company_only_org_unit_does_not_set_department(org_tree):
    """Сотрудник сидит прямо на уровне company — department остаётся пустым."""
    user = UserFactory(org_unit=org_tree["company"])
    user.refresh_from_db()
    assert user.department == ""
    assert user.company == "Релесофт"
