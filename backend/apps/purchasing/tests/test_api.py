import pytest
from rest_framework.test import APIClient

from apps.purchasing.models import PurchasePayment, PurchaseRequest
from .factories import (
    PurchaseOrderFactory,
    PurchaseOrderLineFactory,
    PurchasePaymentFactory,
    PurchaseRequestFactory,
    PurchaseRequestLineFactory,
    StockItemFactory,
    SupplierConditionsFactory,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    user = UserFactory()
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client


@pytest.mark.django_db
class TestStockAPI:
    def test_list(self, authenticated_client):
        StockItemFactory()
        StockItemFactory()
        resp = authenticated_client.get("/api/purchasing/stock/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_detail(self, authenticated_client):
        item = StockItemFactory(quantity=50, reserved=10)
        resp = authenticated_client.get(f"/api/purchasing/stock/{item.pk}/")
        assert resp.status_code == 200
        assert resp.data["quantity"] == 50
        assert resp.data["reserved"] == 10
        assert resp.data["available"] == 40

    def test_movements(self, authenticated_client):
        item = StockItemFactory()
        resp = authenticated_client.get(f"/api/purchasing/stock/{item.pk}/movements/")
        assert resp.status_code == 200

    def test_receive(self, authenticated_client):
        item = StockItemFactory(quantity=10)
        resp = authenticated_client.post(
            f"/api/purchasing/stock/{item.pk}/receive/",
            {"quantity": 20, "comment": "Поставка"},
        )
        assert resp.status_code == 201
        item.refresh_from_db()
        assert item.quantity == 30

    def test_reserve_and_unreserve(self, authenticated_client):
        from apps.orders.tests.factories import OrderFactory
        item = StockItemFactory(quantity=100)
        order = OrderFactory()
        resp = authenticated_client.post(
            f"/api/purchasing/stock/{item.pk}/reserve/",
            {"order": order.pk, "quantity": 30},
        )
        assert resp.status_code == 201
        item.refresh_from_db()
        assert item.reserved == 30

        resp = authenticated_client.post(
            f"/api/purchasing/stock/{item.pk}/unreserve/",
            {"order": order.pk},
        )
        assert resp.status_code == 204
        item.refresh_from_db()
        assert item.reserved == 0


@pytest.mark.django_db
class TestPurchaseRequestAPI:
    def test_list(self, authenticated_client):
        PurchaseRequestFactory()
        resp = authenticated_client.get("/api/purchasing/purchase-requests/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_detail(self, authenticated_client):
        pr = PurchaseRequestFactory()
        PurchaseRequestLineFactory(request=pr)
        resp = authenticated_client.get(f"/api/purchasing/purchase-requests/{pr.pk}/")
        assert resp.status_code == 200
        assert len(resp.data["lines"]) == 1

    def test_submit(self, authenticated_client):
        pr = PurchaseRequestFactory(status=PurchaseRequest.Status.DRAFT)
        resp = authenticated_client.post(f"/api/purchasing/purchase-requests/{pr.pk}/submit/")
        assert resp.status_code == 200
        pr.refresh_from_db()
        assert pr.status == PurchaseRequest.Status.SUBMITTED


@pytest.mark.django_db
class TestPurchaseOrderAPI:
    def test_list(self, authenticated_client):
        PurchaseOrderFactory()
        resp = authenticated_client.get("/api/purchasing/purchase-orders/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_detail_with_lines(self, authenticated_client):
        po = PurchaseOrderFactory()
        PurchaseOrderLineFactory(purchase_order=po)
        resp = authenticated_client.get(f"/api/purchasing/purchase-orders/{po.pk}/")
        assert resp.status_code == 200
        assert len(resp.data["lines"]) == 1

    def test_filter_by_status(self, authenticated_client):
        PurchaseOrderFactory(status="draft")
        PurchaseOrderFactory(status="ordered")
        resp = authenticated_client.get("/api/purchasing/purchase-orders/?status=draft")
        assert resp.status_code == 200
        assert resp.data["count"] == 1


@pytest.mark.django_db
class TestSupplierConditionsAPI:
    def test_list(self, authenticated_client):
        SupplierConditionsFactory()
        resp = authenticated_client.get("/api/purchasing/supplier-conditions/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_detail(self, authenticated_client):
        sc = SupplierConditionsFactory()
        resp = authenticated_client.get(f"/api/purchasing/supplier-conditions/{sc.pk}/")
        assert resp.status_code == 200
        assert resp.data["discount_percent"] == "5.00"


@pytest.mark.django_db
class TestPurchasePaymentAPI:
    def test_list(self, authenticated_client):
        PurchasePaymentFactory()
        resp = authenticated_client.get("/api/purchasing/payments/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_approve(self, authenticated_client):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        resp = authenticated_client.post(f"/api/purchasing/payments/{payment.pk}/approve/")
        assert resp.status_code == 200
        payment.refresh_from_db()
        assert payment.status == PurchasePayment.Status.APPROVED

    def test_reject(self, authenticated_client):
        payment = PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        resp = authenticated_client.post(f"/api/purchasing/payments/{payment.pk}/reject/")
        assert resp.status_code == 200
        payment.refresh_from_db()
        assert payment.status == PurchasePayment.Status.REJECTED

    def test_pending_list(self, authenticated_client):
        PurchasePaymentFactory(status=PurchasePayment.Status.PENDING_APPROVAL)
        PurchasePaymentFactory(status=PurchasePayment.Status.PAID)
        resp = authenticated_client.get("/api/purchasing/payments/pending/")
        assert resp.status_code == 200
        assert len(resp.data) == 1
