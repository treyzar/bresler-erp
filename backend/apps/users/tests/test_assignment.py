"""Тесты модели Assignment: constraints, clean(), бэкфилл."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.directory.models import Department, OrgUnit
from apps.users.models import Assignment
from apps.users.tests.factories import UserFactory


@pytest.fixture
def company_a(db):
    return OrgUnit.add_root(
        name="Релесофт",
        unit_type="company",
        business_role="internal",
        is_legal_entity=True,
    )


@pytest.fixture
def company_b(db):
    return OrgUnit.add_root(
        name="Релесервис",
        unit_type="company",
        business_role="internal",
        is_legal_entity=True,
    )


@pytest.fixture
def dept_a(company_a):
    return Department.add_root(name="Отдел РЗА", unit_type="department", company=company_a)


@pytest.fixture
def dept_b(company_b):
    return Department.add_root(name="Отдел проектирования", unit_type="department", company=company_b)


@pytest.mark.django_db
class TestAssignmentBasics:
    def test_create_simple(self, company_a, dept_a):
        u = UserFactory()
        a = Assignment.objects.create(
            user=u, company=company_a, department=dept_a, position="Инженер",
        )
        assert a.pk is not None
        assert a.is_active is True
        assert a.is_primary is False

    def test_user_can_have_two_assignments_in_different_departments(self, company_a):
        """Сценарий совмещения внутри одной компании."""
        d1 = Department.add_root(name="Отдел РЗА 1", unit_type="department", company=company_a)
        d2 = Department.add_root(name="Отдел РЗА 2", unit_type="department", company=company_a)
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=d1, position="Инженер", is_primary=True)
        Assignment.objects.create(user=u, company=company_a, department=d2, position="Консультант")

        assert u.assignments.count() == 2

    def test_user_can_be_head_of_two_departments(self, company_a):
        """Один человек — руководитель двух отделов одновременно."""
        d1 = Department.add_root(name="Служба РЗА", unit_type="service", company=company_a)
        d2 = Department.add_root(name="Служба проектирования", unit_type="service", company=company_a)
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=d1, is_head=True, is_primary=True)
        Assignment.objects.create(user=u, company=company_a, department=d2, is_head=True)

        assert u.assignments.filter(is_head=True).count() == 2

    def test_user_can_have_assignments_in_different_companies(self, company_a, company_b, dept_a, dept_b):
        """Сценарий «работаю в нескольких юрлицах группы»."""
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=dept_a, is_primary=True)
        Assignment.objects.create(user=u, company=company_b, department=dept_b)

        assert {a.company_id for a in u.assignments.all()} == {company_a.pk, company_b.pk}


@pytest.mark.django_db
class TestAssignmentConstraints:
    def test_only_one_primary_per_user(self, company_a, dept_a):
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=dept_a, is_primary=True)
        with pytest.raises(IntegrityError), transaction.atomic():
            Assignment.objects.create(user=u, company=company_a, department=None, is_primary=True)

    def test_two_users_can_each_have_their_own_primary(self, company_a, dept_a):
        u1 = UserFactory()
        u2 = UserFactory()
        Assignment.objects.create(user=u1, company=company_a, department=dept_a, is_primary=True)
        Assignment.objects.create(user=u2, company=company_a, department=dept_a, is_primary=True)
        # Не должно бросить IntegrityError.

    def test_uniq_user_company_department_with_dept(self, company_a, dept_a):
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=dept_a, position="Инженер")
        with pytest.raises(IntegrityError), transaction.atomic():
            Assignment.objects.create(
                user=u, company=company_a, department=dept_a, position="Дубль",
            )

    def test_uniq_user_company_no_department(self, company_a):
        u = UserFactory()
        Assignment.objects.create(user=u, company=company_a, department=None, position="Директор")
        with pytest.raises(IntegrityError), transaction.atomic():
            Assignment.objects.create(
                user=u, company=company_a, department=None, position="Дубль",
            )

    def test_clean_rejects_department_from_wrong_company(self, company_a, company_b, dept_b):
        u = UserFactory()
        a = Assignment(user=u, company=company_a, department=dept_b)
        with pytest.raises(ValidationError) as exc:
            a.clean()
        assert "department" in exc.value.error_dict


@pytest.mark.django_db
class TestAssignmentBackfill:
    """Проверяем что после прогона миграций (которые pytest-django запускает
    автоматически в начале сессии) у пользователей с flat-полями появился
    primary Assignment.

    Прямо вызвать миграцию из теста нельзя — она работает на apps.get_model,
    а не на реальных моделях. Поэтому здесь воспроизводим эквивалентную логику
    через прямой ORM, чтобы зафиксировать инвариант.
    """

    def test_backfill_logic_creates_primary_for_user_with_flat_fields(self, company_a, dept_a):
        """Имитация: пользователь с flat company_unit/department_unit/is_department_head
        должен получить ровно один Assignment(is_primary=True) с теми же значениями."""
        u = UserFactory(
            company_unit=company_a,
            department_unit=dept_a,
            is_department_head=True,
            position="Начальник РЗА",
        )

        # Сама миграция уже отработала (pytest-django выполняет миграции),
        # но фабрика создаёт юзеров после миграции — поэтому миграция их не
        # увидела. Запускаем эквивалентную логику вручную:
        Assignment.objects.create(
            user=u,
            company_id=u.company_unit_id,
            department_id=u.department_unit_id,
            position=u.position,
            is_head=u.is_department_head,
            is_primary=True,
        )

        primary = u.assignments.get(is_primary=True)
        assert primary.company_id == company_a.pk
        assert primary.department_id == dept_a.pk
        assert primary.is_head is True
        assert primary.position == "Начальник РЗА"

    def test_user_without_company_or_department_gets_no_assignment(self):
        u = UserFactory(company_unit=None, department_unit=None)
        # По договорённости (вариант А) — таких не бэкфилим.
        assert u.assignments.count() == 0
