import pytest
from decimal import Decimal

from apps.purchasing.models import (
    PurchaseOrder,
    PurchasePayment,
    PurchaseRequest,
    StockMovement,
)
from apps.purchasing.services import stock_service, purchasing_service
from .factories import (
    PurchaseOrderFactory,
    PurchasePaymentFactory,
    PurchaseRequestFactory,
    PurchaseRequestLineFactory,
    StockItemFactory,
    SupplierFactory,
)
from apps.users.tests.factories import UserFactory
from apps.orders.tests.factories import OrderFactory


@pytest.mark.django_db
class TestStockService:
    def test_receive_stock(self):
        item = StockItemFactory(quantity=50)
        user = UserFactory()
        movement = stock_service.receive_stock(item, 30, user, comment="Поставка")
        item.refresh_from_db()
        assert item.quantity == 80
        assert movement.movement_type == StockMovement.MovementType.RECEIPT
        assert movement.quantity == 30

    def test_issue_stock(self):
        item = StockItemFactory(quantity=50)
        user = UserFactory()
        movement = stock_service.issue_stock(item, 20, user)
        item.refresh_from_db()
        assert item.quantity == 30
        assert movement.movement_type == StockMovement.MovementType.ISSUE

    def test_issue_stock_insufficient(self):
        item = StockItemFactory(quantity=5)
        user = UserFactory()
        with pytest.raises(ValueError, match="Недостаточно"):
            stock_service.issue_stock(item, 10, user)

    def test_reserve_and_unreserve(self):
        item = StockItemFactory(quantity=100, reserved=0)
        user = UserFactory()
        order = OrderFactory()
        reservation = stock_service.reserve_stock(item, order, 30, user)
        item.refresh_from_db()
        assert item.reserved == 30
        assert item.available == 70
        assert reservation.quantity == 30

        stock_service.unreserve_stock(reservation, user)
        item.refresh_from_db()
        assert item.reserved == 0
        assert item.available == 100

    def test_reserve_insufficient(self):
        item = StockItemFactory(quantity=10, reserved=5)
        user = UserFactory()
        order = OrderFactory()
        with pytest.raises(ValueError, match="Недостаточно"):
            stock_service.reserve_stock(item, order, 10, user)


@pytest.mark.django_db
class TestPurchasingService:
    def test_submit_request(self):
        pr = PurchaseRequestFactory(status=PurchaseRequest.Status.DRAFT)
        user = UserFactory()
        purchasing_service.submit_request(pr, user)
        pr.refresh_from_db()
        assert pr.status == PurchaseRequest.Status.SUBMITTED

    def test_submit_non_draft_fails(self):
        pr = PurchaseRequestFactory(status=PurchaseRequest.Status.SUBMITTED)
        user = UserFactory()
        with pytest.raises(ValueError, match="черновик"):
            purchasing_service.submit_request(pr, user)

    def test_create_order_from_request(self):
        pr = PurchaseRequestFactory()
        PurchaseRequestLineFactory(request=pr, name="Реле", quantity=10)
        PurchaseRequestLineFactory(request=pr, name="Контактор", quantity=5)
        supplier = SupplierFactory()
        user = UserFactory()

        po = purchasing_service.create_order_from_request(pr, supplier, user)
        assert po.supplier == supplier
        assert po.lines.count() == 2
        assert po.order == pr.order
        pr.refresh_from_db()
        assert pr.status == PurchaseRequest.Status.IN_PROGRESS

    def test_approve_payment(self):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        user = UserFactory()
        purchasing_service.approve_payment(payment, user)
        payment.refresh_from_db()
        assert payment.status == PurchasePayment.Status.APPROVED
        assert payment.approved_by == user

    def test_reject_payment(self):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        user = UserFactory()
        purchasing_service.reject_payment(payment, user)
        payment.refresh_from_db()
        assert payment.status == PurchasePayment.Status.REJECTED

    def test_mark_paid(self):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.APPROVED)
        purchasing_service.mark_payment_paid(payment)
        payment.refresh_from_db()
        assert payment.status == PurchasePayment.Status.PAID

    def test_mark_paid_not_approved_fails(self):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        with pytest.raises(ValueError, match="не согласована"):
            purchasing_service.mark_payment_paid(payment)
