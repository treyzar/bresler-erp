"""Тесты admin-логики массового назначения сотрудников в Department."""

import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from apps.directory.admin import DepartmentAdmin, DepartmentAdminForm
from apps.directory.models import Department, OrgUnit
from apps.users.tests.factories import UserFactory


@pytest.fixture
def company(db):
    return OrgUnit.add_root(
        name="Релесофт",
        unit_type="company",
        business_role="internal",
        is_legal_entity=True,
    )


@pytest.fixture
def dept(company):
    return Department.add_root(name="Отдел РЗА", unit_type="department", company=company)


@pytest.fixture
def admin_obj(db):
    return DepartmentAdmin(Department, AdminSite())


@pytest.fixture
def admin_user(db):
    return UserFactory(is_staff=True, is_superuser=True, username="root")


@pytest.fixture
def request_factory():
    return RequestFactory()


def _form_data(dept, employees_pks):
    return {
        "name": dept.name,
        "full_name": dept.full_name or "",
        "unit_type": dept.unit_type,
        "company": dept.company_id,
        "description": dept.description or "",
        "is_active": dept.is_active,
        "employees": [str(pk) for pk in employees_pks],
        # Department.node_order_by=["name"] → MoveNodeForm допускает только sorted-*.
        # Передаём sorted-sibling без ref — SafeMoveNodeForm пропустит move(),
        # т.к. эти значения не появятся в changed_data при edit.
        "_position": "sorted-sibling",
        "_ref_node_id": "",
    }


@pytest.mark.django_db
class TestDepartmentAdminEmployeePicker:
    def test_initial_lists_currently_assigned_users(self, dept):
        u1 = UserFactory(department_unit=dept)
        u2 = UserFactory(department_unit=dept)
        UserFactory()  # not in this dept

        form = DepartmentAdminForm(instance=dept)

        assert set(form.fields["employees"].initial) == {u1.pk, u2.pk}

    def test_save_assigns_new_users_and_unassigns_removed(
        self, dept, admin_obj, admin_user, request_factory,
    ):
        already_in = UserFactory(department_unit=dept)
        to_add_1 = UserFactory()
        to_add_2 = UserFactory()

        request = request_factory.post("/")
        request.user = admin_user

        form = DepartmentAdminForm(
            data=_form_data(dept, [to_add_1.pk, to_add_2.pk]),
            instance=dept,
        )
        assert form.is_valid(), form.errors

        # Воспроизводим стандартный admin flow: form.save(commit=False)
        # выставляет form.save_m2m, дальше save_model и save_related.
        new_object = form.save(commit=False)
        admin_obj.save_model(request, new_object, form, change=True)
        admin_obj.save_related(request, form, formsets=[], change=True)

        already_in.refresh_from_db()
        to_add_1.refresh_from_db()
        to_add_2.refresh_from_db()

        assert already_in.department_unit_id is None
        assert to_add_1.department_unit_id == dept.pk
        assert to_add_2.department_unit_id == dept.pk

    def test_save_does_not_touch_users_outside_universe(
        self, company, admin_obj, admin_user, request_factory,
    ):
        """Если у пользователя department_unit=другой отдел — этот отдел его не должен задеть."""
        dept_a = Department.add_root(name="A", unit_type="department", company=company)
        dept_b = Department.add_root(name="B", unit_type="department", company=company)

        in_b = UserFactory(department_unit=dept_b)
        new_user = UserFactory()

        request = request_factory.post("/")
        request.user = admin_user

        form = DepartmentAdminForm(
            data=_form_data(dept_a, [new_user.pk]),
            instance=dept_a,
        )
        assert form.is_valid(), form.errors

        # Воспроизводим стандартный admin flow: form.save(commit=False)
        # выставляет form.save_m2m, дальше save_model и save_related.
        new_object = form.save(commit=False)
        admin_obj.save_model(request, new_object, form, change=True)
        admin_obj.save_related(request, form, formsets=[], change=True)

        in_b.refresh_from_db()
        new_user.refresh_from_db()

        assert in_b.department_unit_id == dept_b.pk
        assert new_user.department_unit_id == dept_a.pk

    def test_signal_syncs_legacy_strings_after_assignment(
        self, dept, admin_obj, admin_user, request_factory,
    ):
        new_user = UserFactory(department="", company="")

        request = request_factory.post("/")
        request.user = admin_user

        form = DepartmentAdminForm(
            data=_form_data(dept, [new_user.pk]),
            instance=dept,
        )
        assert form.is_valid(), form.errors

        # Воспроизводим стандартный admin flow: form.save(commit=False)
        # выставляет form.save_m2m, дальше save_model и save_related.
        new_object = form.save(commit=False)
        admin_obj.save_model(request, new_object, form, change=True)
        admin_obj.save_related(request, form, formsets=[], change=True)

        new_user.refresh_from_db()
        assert new_user.department == dept.name
        assert new_user.company_unit_id == dept.company_id
        assert new_user.company == dept.company.name
