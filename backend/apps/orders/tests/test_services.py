import pytest

from apps.orders.models import Contract, Order
from apps.orders.services.contract_service import get_or_create_contract, update_contract
from apps.orders.services.order_service import create_order, get_next_order_number

from .factories import ContractFactory, OrderFactory


# ---------------------------------------------------------------------------
# OrderService
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderService:
    def test_get_next_order_number_empty(self):
        assert get_next_order_number() == 1

    def test_get_next_order_number(self):
        OrderFactory(order_number=10)
        OrderFactory(order_number=20)
        assert get_next_order_number() == 21

    def test_create_order_auto_number(self):
        OrderFactory(order_number=5)
        order = create_order()
        assert order.pk is not None
        assert order.order_number == 6

    def test_create_order_explicit_number(self):
        order = create_order(order_number=42)
        assert order.order_number == 42

    def test_create_order_first(self):
        order = create_order()
        assert order.order_number == 1


# ---------------------------------------------------------------------------
# ContractService
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestContractService:
    def test_get_or_create_new(self):
        order = OrderFactory()
        contract = get_or_create_contract(order, contract_number="K-001")
        assert contract.pk is not None
        assert contract.order == order
        assert contract.contract_number == "K-001"

    def test_get_or_create_existing(self):
        contract = ContractFactory(contract_number="K-002")
        result = get_or_create_contract(contract.order, contract_number="K-IGNORED")
        assert result.pk == contract.pk
        assert result.contract_number == "K-002"

    def test_update_contract(self):
        contract = ContractFactory(contract_number="K-003")
        updated = update_contract(
            contract.order,
            status=Contract.Status.ADVANCE_PAID,
            amount=50000,
        )
        assert updated.status == Contract.Status.ADVANCE_PAID
        assert updated.amount == 50000

    def test_update_contract_not_found(self):
        order = OrderFactory()
        with pytest.raises(Contract.DoesNotExist):
            update_contract(order, status=Contract.Status.FULLY_PAID)
