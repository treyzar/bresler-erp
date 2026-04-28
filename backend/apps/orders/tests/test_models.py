import pytest
from django.db import IntegrityError

from apps.directory.tests.factories import (
    ContactFactory,
    EquipmentFactory,
    OrgUnitFactory,
    TypeOfWorkFactory,
)
from apps.orders.models import Contract, Order, OrderFile, OrderOrgUnit, OrderParticipant
from apps.users.tests.factories import UserFactory

from .factories import (
    ContractFactory,
    OrderFactory,
    OrderFileFactory,
    OrderOrgUnitFactory,
    OrderParticipantFactory,
)


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrder:
    def test_create(self):
        order = OrderFactory()
        assert order.pk is not None
        assert order.order_number >= 1

    def test_str(self):
        order = OrderFactory(order_number=42)
        assert str(order) == "Заказ #42"

    def test_order_number_unique(self):
        OrderFactory(order_number=100)
        with pytest.raises(IntegrityError):
            OrderFactory(order_number=100)

    def test_status_default(self):
        order = OrderFactory()
        assert order.status == Order.Status.NEW

    def test_status_choices(self):
        for status_val, _ in Order.Status.choices:
            order = OrderFactory(status=status_val)
            assert order.status == status_val

    def test_customer_protect(self):
        from django.db.models.deletion import ProtectedError
        order = OrderFactory()
        with pytest.raises(ProtectedError):
            order.customer_org_unit.delete()

    def test_intermediary_set_null(self):
        intermediary = OrgUnitFactory()
        order = OrderFactory(intermediary=intermediary)
        intermediary.delete()
        order.refresh_from_db()
        assert order.intermediary is None

    def test_designer_set_null(self):
        designer = OrgUnitFactory()
        order = OrderFactory(designer=designer)
        designer.delete()
        order.refresh_from_db()
        assert order.designer is None

    def test_country_set_null(self):
        order = OrderFactory()
        country = order.country
        country.delete()
        order.refresh_from_db()
        assert order.country is None

    def test_m2m_contacts(self):
        contact1 = ContactFactory()
        contact2 = ContactFactory()
        order = OrderFactory(contacts=[contact1, contact2])
        assert order.contacts.count() == 2

    def test_m2m_managers(self):
        user1 = UserFactory()
        user2 = UserFactory()
        order = OrderFactory(managers=[user1, user2])
        assert order.managers.count() == 2

    def test_m2m_equipments(self):
        eq1 = EquipmentFactory()
        eq2 = EquipmentFactory()
        order = OrderFactory(equipments=[eq1, eq2])
        assert order.equipments.count() == 2

    def test_m2m_works(self):
        w1 = TypeOfWorkFactory()
        w2 = TypeOfWorkFactory()
        order = OrderFactory(works=[w1, w2])
        assert order.works.count() == 2

    def test_ordering(self):
        OrderFactory(order_number=10)
        OrderFactory(order_number=20)
        OrderFactory(order_number=5)
        numbers = list(Order.objects.values_list("order_number", flat=True))
        assert numbers == [20, 10, 5]

    def test_history_tracking(self):
        order = OrderFactory()
        assert order.history.count() == 1

        order.status = Order.Status.PRODUCTION
        order.save()
        assert order.history.count() == 2

    def test_related_orders(self):
        order1 = OrderFactory()
        order2 = OrderFactory()
        order1.related_orders.add(order2)
        assert order2 in order1.related_orders.all()


# ---------------------------------------------------------------------------
# OrderOrgUnit (through model)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderOrgUnit:
    def test_create(self):
        oou = OrderOrgUnitFactory()
        assert oou.pk is not None
        assert oou.role == "customer"

    def test_unique_together(self):
        oou = OrderOrgUnitFactory()
        with pytest.raises(IntegrityError):
            OrderOrgUnit.objects.create(
                order=oou.order,
                org_unit=oou.org_unit,
                role=oou.role,
            )

    def test_different_roles_allowed(self):
        order = OrderFactory()
        org_unit = OrgUnitFactory()
        OrderOrgUnit.objects.create(order=order, org_unit=org_unit, role="customer")
        oou2 = OrderOrgUnit.objects.create(order=order, org_unit=org_unit, role="supplier")
        assert oou2.pk is not None

    def test_cascade_on_order_delete(self):
        oou = OrderOrgUnitFactory()
        order_pk = oou.order.pk
        Order.objects.filter(pk=order_pk).delete()
        assert not OrderOrgUnit.objects.filter(pk=oou.pk).exists()

    def test_ordering(self):
        order = OrderFactory()
        org1 = OrgUnitFactory()
        org2 = OrgUnitFactory()
        OrderOrgUnit.objects.create(order=order, org_unit=org1, role="a", order_index=2)
        OrderOrgUnit.objects.create(order=order, org_unit=org2, role="b", order_index=1)
        indices = list(OrderOrgUnit.objects.filter(order=order).values_list("order_index", flat=True))
        assert indices == [1, 2]


# ---------------------------------------------------------------------------
# OrderParticipant (through model)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderParticipant:
    def test_create(self):
        op = OrderParticipantFactory()
        assert op.pk is not None

    def test_cascade_on_order_delete(self):
        op = OrderParticipantFactory()
        order_pk = op.order.pk
        Order.objects.filter(pk=order_pk).delete()
        assert not OrderParticipant.objects.filter(pk=op.pk).exists()

    def test_ordering(self):
        order = OrderFactory()
        org1 = OrgUnitFactory()
        org2 = OrgUnitFactory()
        OrderParticipant.objects.create(order=order, org_unit=org1, order_index=2)
        OrderParticipant.objects.create(order=order, org_unit=org2, order_index=1)
        indices = list(OrderParticipant.objects.filter(order=order).values_list("order_index", flat=True))
        assert indices == [1, 2]


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestContract:
    def test_create(self):
        contract = ContractFactory()
        assert contract.pk is not None

    def test_str(self):
        contract = ContractFactory(contract_number="K-001")
        assert str(contract) == "Контракт K-001"

    def test_contract_number_unique(self):
        ContractFactory(contract_number="K-100")
        with pytest.raises(IntegrityError):
            ContractFactory(contract_number="K-100")

    def test_one_to_one(self):
        contract = ContractFactory()
        with pytest.raises(IntegrityError):
            Contract.objects.create(
                order=contract.order,
                contract_number="K-DUPLICATE",
            )

    def test_cascade_on_order_delete(self):
        contract = ContractFactory()
        order_pk = contract.order.pk
        Order.objects.filter(pk=order_pk).delete()
        assert not Contract.objects.filter(pk=contract.pk).exists()

    def test_status_default(self):
        contract = ContractFactory()
        assert contract.status == Contract.Status.NOT_PAID

    def test_history_tracking(self):
        contract = ContractFactory()
        assert contract.history.count() == 1

        contract.status = Contract.Status.ADVANCE_PAID
        contract.save()
        assert contract.history.count() == 2

    def test_payment_fields(self):
        contract = ContractFactory(
            advance_percent=30,
            intermediate_percent=40,
            post_payment_percent=30,
            amount=1000000,
            deadline_days=90,
        )
        assert contract.advance_percent == 30
        assert contract.amount == 1000000
        assert contract.deadline_days == 90


# ---------------------------------------------------------------------------
# OrderFile
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderFile:
    def test_create(self):
        of = OrderFileFactory()
        assert of.pk is not None

    def test_str(self):
        of = OrderFileFactory(original_name="report.pdf")
        assert str(of) == "report.pdf"

    def test_cascade_on_order_delete(self):
        of = OrderFileFactory()
        order_pk = of.order.pk
        Order.objects.filter(pk=order_pk).delete()
        assert not OrderFile.objects.filter(pk=of.pk).exists()

    def test_file_size(self):
        of = OrderFileFactory(file_size=2048)
        assert of.file_size == 2048
