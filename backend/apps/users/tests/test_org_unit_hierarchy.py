"""Тесты User: company_unit, department_unit, supervisor, company_root, full_name_short."""

import pytest

from apps.directory.models import Department, OrgUnit
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org_tree(db):
    """Строим тестовое дерево:
    OrgUnit "Релесофт" (internal, company)
      ├─ Department "Служба РЗА" (service)
      │    ├─ Department "Отдел РЗА 1" (department)
      │    │    └─ Department "Сектор А" (sector)
      │    └─ Department "Отдел РЗА 2" (department)
      └─ Department "Отдел проектирования" (department)
    """
    company = OrgUnit.add_root(
        name="Релесофт", unit_type="company", business_role="internal", is_legal_entity=True,
    )
    service = Department.add_root(name="Служба РЗА", unit_type="service", company=company)
    dept1 = service.add_child(name="Отдел РЗА 1", unit_type="department", company=company)
    sector = dept1.add_child(name="Сектор А", unit_type="sector", company=company)
    dept2 = service.add_child(name="Отдел РЗА 2", unit_type="department", company=company)
    design = Department.add_root(name="Отдел проектирования", unit_type="department", company=company)
    return {
        "company": company,
        "service": service,
        "dept1": dept1,
        "sector": sector,
        "dept2": dept2,
        "design": design,
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
def test_company_root_from_department(org_tree):
    user = UserFactory(department_unit=org_tree["sector"])
    user.refresh_from_db()
    assert user.company_root is not None
    assert user.company_root.pk == org_tree["company"].pk


@pytest.mark.django_db
def test_company_root_from_company_unit_directly(org_tree):
    user = UserFactory(company_unit=org_tree["company"], department_unit=None)
    user.refresh_from_db()
    assert user.company_root.pk == org_tree["company"].pk


@pytest.mark.django_db
def test_company_root_none_without_fks():
    user = UserFactory(company_unit=None, department_unit=None)
    assert user.company_root is None


@pytest.mark.django_db
def test_resolve_supervisor_via_explicit_fk(org_tree):
    boss = UserFactory(department_unit=org_tree["dept1"])
    employee = UserFactory(department_unit=org_tree["sector"], supervisor=boss)
    assert employee.resolve_supervisor().pk == boss.pk


@pytest.mark.django_db
def test_resolve_supervisor_via_sector_head(org_tree):
    head = UserFactory(department_unit=org_tree["sector"], is_department_head=True)
    employee = UserFactory(department_unit=org_tree["sector"])
    assert employee.resolve_supervisor().pk == head.pk


@pytest.mark.django_db
def test_resolve_supervisor_walks_up_the_tree(org_tree):
    """Нет head в секторе — ищем в отделе, потом в службе."""
    dept_head = UserFactory(department_unit=org_tree["dept1"], is_department_head=True)
    employee = UserFactory(department_unit=org_tree["sector"])
    assert employee.resolve_supervisor().pk == dept_head.pk


@pytest.mark.django_db
def test_resolve_supervisor_skips_self(org_tree):
    dept_head = UserFactory(department_unit=org_tree["dept1"], is_department_head=True)
    sector_head = UserFactory(department_unit=org_tree["sector"], is_department_head=True)
    # sector_head — сам head своего сектора, но для СЕБЯ ищется руководитель выше.
    assert sector_head.resolve_supervisor().pk == dept_head.pk


@pytest.mark.django_db
def test_resolve_supervisor_falls_through_to_company_head(org_tree):
    """Если дерево подразделений не содержит head — ищем директора на уровне company."""
    director = UserFactory(
        company_unit=org_tree["company"], department_unit=None, is_department_head=True,
    )
    employee = UserFactory(
        company_unit=org_tree["company"], department_unit=org_tree["sector"],
    )
    assert employee.resolve_supervisor().pk == director.pk


@pytest.mark.django_db
def test_resolve_supervisor_returns_none_without_chain():
    employee = UserFactory(company_unit=None, department_unit=None, supervisor=None)
    assert employee.resolve_supervisor() is None


@pytest.mark.django_db
def test_legacy_fields_synced_from_department_unit(org_tree):
    user = UserFactory(department_unit=org_tree["sector"])
    user.refresh_from_db()
    assert user.department == "Сектор А"
    assert user.company == "Релесофт"


@pytest.mark.django_db
def test_legacy_fields_synced_from_company_unit_only(org_tree):
    user = UserFactory(company_unit=org_tree["company"], department_unit=None)
    user.refresh_from_db()
    assert user.department == ""  # прямо на уровне компании — department не имеет смысла
    assert user.company == "Релесофт"


@pytest.mark.django_db
def test_legacy_fields_preserved_without_fks():
    """Без FK сигнал не трогает — legacy-значения остаются."""
    user = UserFactory(
        company_unit=None, department_unit=None,
        department="Старый отдел", company="Старая компания",
    )
    user.refresh_from_db()
    assert user.department == "Старый отдел"
    assert user.company == "Старая компания"


@pytest.mark.django_db
def test_department_unit_auto_fills_company_unit(org_tree):
    """Если указан только department_unit, сигнал дозаполняет company_unit из его .company."""
    user = UserFactory(department_unit=org_tree["sector"], company_unit=None)
    user.refresh_from_db()
    assert user.company_unit_id == org_tree["company"].pk
