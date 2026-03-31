"""Tests for ExportMixin."""

import pytest
from rest_framework import status

from apps.orders.tests.factories import ContractFactory, OrderFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestOrderExport:
    def setup_method(self):
        self.user = UserFactory()

    def _auth_client(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_export_csv(self, api_client):
        OrderFactory.create_batch(3)
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/", {"export_format": "csv"})
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]
        content = response.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        assert len(lines) == 4  # header + 3 rows
        assert "Номер заказа" in lines[0]

    def test_export_xlsx(self, api_client):
        OrderFactory.create_batch(2)
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/", {"export_format": "xlsx"})
        assert response.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in response["Content-Type"]
        assert len(response.content) > 0

    def test_export_default_format_is_xlsx(self, api_client):
        OrderFactory()
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/")
        assert response.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in response["Content-Type"]

    def test_export_with_filters(self, api_client):
        OrderFactory(status="N")
        OrderFactory(status="N")
        OrderFactory(status="D")
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/", {"export_format": "csv", "status": "N"})
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        assert len(lines) == 3  # header + 2 rows (only status=N)

    def test_export_empty_result(self, api_client):
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/", {"export_format": "csv"})
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        assert len(lines) == 1  # header only

    def test_export_includes_contract_fields(self, api_client):
        order = OrderFactory()
        ContractFactory(order=order, contract_number="TEST-001", amount=100000)
        client = self._auth_client(api_client)
        response = client.get("/api/orders/export/", {"export_format": "csv"})
        content = response.content.decode("utf-8-sig")
        assert "TEST-001" in content
        assert "100000" in content

    def test_export_unauthenticated(self, api_client):
        response = api_client.get("/api/orders/export/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
