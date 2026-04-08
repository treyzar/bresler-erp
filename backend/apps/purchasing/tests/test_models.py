import pytest
from decimal import Decimal

from apps.purchasing.models import (
    PurchaseOrder,
    PurchasePayment,
    PurchaseRequest,
    StockItem,
)
from .factories import (
    PurchaseOrderFactory,
    PurchaseOrderLineFactory,
    PurchasePaymentFactory,
    PurchaseRequestFactory,
    PurchaseRequestLineFactory,
    StockItemFactory,
    SupplierConditionsFactory,
)


@pytest.mark.django_db
class TestStockItem:
    def test_create(self):
        item = StockItemFactory(quantity=100, reserved=20)
        assert item.quantity == 100
        assert item.reserved == 20
        assert item.available == 80

    def test_available_never_negative(self):
        item = StockItemFactory(quantity=10, reserved=20)
        assert item.available == 0

    def test_str(self):
        item = StockItemFactory()
        assert str(item.product.name) in str(item)


@pytest.mark.django_db
class TestPurchaseRequest:
    def test_create(self):
        pr = PurchaseRequestFactory()
        assert pr.status == PurchaseRequest.Status.DRAFT
        assert pr.order is not None
        assert pr.created_by is not None

    def test_with_lines(self):
        pr = PurchaseRequestFactory()
        line1 = PurchaseRequestLineFactory(request=pr, name="Реле", quantity=10)
        line2 = PurchaseRequestLineFactory(request=pr, name="Трансформатор", quantity=5)
        assert pr.lines.count() == 2
        assert line1.quantity == 10
        assert line2.name == "Трансформатор"

    def test_str(self):
        pr = PurchaseRequestFactory()
        assert str(pr.order.order_number) in str(pr)


@pytest.mark.django_db
class TestPurchaseOrder:
    def test_create(self):
        po = PurchaseOrderFactory()
        assert po.status == PurchaseOrder.Status.DRAFT
        assert po.supplier is not None
        assert po.supplier.business_role == "supplier"

    def test_total_amount(self):
        po = PurchaseOrderFactory()
        PurchaseOrderLineFactory(purchase_order=po, quantity=5, unit_price="200.00")
        PurchaseOrderLineFactory(purchase_order=po, quantity=3, unit_price="100.00")
        assert po.total_amount == Decimal("1300.00")

    def test_line_auto_total(self):
        line = PurchaseOrderLineFactory(quantity=7, unit_price="150.50")
        assert line.total_price == Decimal("1053.50")


@pytest.mark.django_db
class TestSupplierConditions:
    def test_create(self):
        sc = SupplierConditionsFactory()
        assert Decimal(str(sc.discount_percent)) == Decimal("5.00")
        assert sc.supplier.business_role == "supplier"


@pytest.mark.django_db
class TestPurchasePayment:
    def test_create(self):
        payment = PurchasePaymentFactory()
        assert payment.status == PurchasePayment.Status.PENDING_APPROVAL
        assert Decimal(str(payment.amount)) == Decimal("50000.00")

    def test_str(self):
        payment = PurchasePaymentFactory()
        assert "50000" in str(payment)
