"""Tests for Reports and Dashboard APIs."""

import pytest
from rest_framework import status

from apps.orders.tests.factories import ContractFactory, OrderFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestReportsAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_list_reports(self, api_client):
        client = self._auth(api_client)
        resp = client.get("/api/reports/")
        assert resp.status_code == status.HTTP_200_OK
        names = [r["name"] for r in resp.data]
        assert "orders_by_status" in names
        assert "orders_by_manager" in names
        assert "overdue_orders" in names

    def test_orders_by_status_report(self, api_client):
        OrderFactory(status="N")
        OrderFactory(status="N")
        OrderFactory(status="D")
        client = self._auth(api_client)
        resp = client.get("/api/reports/orders_by_status/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 2
        assert "data" in resp.data
        assert "meta" in resp.data

    def test_orders_by_manager_report(self, api_client):
        order = OrderFactory()
        order.managers.add(self.user)
        client = self._auth(api_client)
        resp = client.get("/api/reports/orders_by_manager/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

    def test_overdue_orders_report(self, api_client):
        from datetime import date, timedelta

        OrderFactory(status="P", ship_date=date.today() - timedelta(days=5))
        client = self._auth(api_client)
        resp = client.get("/api/reports/overdue_orders/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1
        assert resp.data["data"][0]["days_overdue"] >= 5

    def test_orders_timeline_report(self, api_client):
        OrderFactory.create_batch(3)
        client = self._auth(api_client)
        resp = client.get("/api/reports/orders_timeline/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

    def test_contract_payments_report(self, api_client):
        ContractFactory(status="not_paid", amount=100000)
        ContractFactory(status="fully_paid", amount=200000)
        client = self._auth(api_client)
        resp = client.get("/api/reports/contract_payments/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 2

    def test_report_with_date_filter(self, api_client):
        client = self._auth(api_client)
        resp = client.get(
            "/api/reports/orders_by_status/",
            {
                "date_from": "2026-01-01",
                "date_to": "2026-12-31",
            },
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_nonexistent_report(self, api_client):
        client = self._auth(api_client)
        resp = client.get("/api/reports/nonexistent/")
        assert resp.status_code == 404

    def test_unauthenticated(self, api_client):
        resp = api_client.get("/api/reports/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDashboardAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_dashboard(self, api_client):
        OrderFactory.create_batch(3)
        ContractFactory(amount=50000)
        client = self._auth(api_client)
        resp = client.get("/api/dashboard/")
        assert resp.status_code == status.HTTP_200_OK
        assert "total_orders" in resp.data
        assert "in_progress" in resp.data
        assert "overdue" in resp.data
        assert "total_contract_amount" in resp.data
        assert "orders_by_status" in resp.data
        assert "orders_timeline" in resp.data
        assert "my_orders" in resp.data
        assert resp.data["total_orders"] >= 4  # 3 + 1 from contract factory

    def test_dashboard_my_orders(self, api_client):
        order = OrderFactory(status="P")
        order.managers.add(self.user)
        client = self._auth(api_client)
        resp = client.get("/api/dashboard/")
        assert len(resp.data["my_orders"]) >= 1
        assert resp.data["my_orders"][0]["order_number"] == order.order_number
