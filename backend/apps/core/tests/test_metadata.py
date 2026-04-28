"""Tests for MetadataMixin — /meta/ endpoint on ViewSets."""

import pytest
from rest_framework import status

from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestOrderMetaEndpoint:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_meta_returns_200(self, api_client):
        client = self._auth(api_client)
        response = client.get("/api/orders/meta/")
        assert response.status_code == status.HTTP_200_OK

    def test_meta_model_info(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        assert data["model"] == "Order"
        assert data["model_verbose"] is not None

    def test_meta_filters_present(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        filters = data["filters"]
        filter_names = [f["name"] for f in filters]

        # Key filters from OrderFilter should be present
        assert "status" in filter_names
        assert "customer" in filter_names
        assert "country" in filter_names
        assert "ship_date_from" in filter_names
        assert "ship_date_to" in filter_names
        assert "tender_number" in filter_names
        assert "equipment" in filter_names

        # 'search' should be excluded (handled by search_fields)
        assert "search" not in filter_names

    def test_meta_filter_structure(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        # Status should have choices
        status_filter = filters["status"]
        assert status_filter["type"] == "choice"
        assert "choices" in status_filter
        assert len(status_filter["choices"]) > 0
        assert all("value" in c and "label" in c for c in status_filter["choices"])

    def test_meta_extra_merged(self, api_client):
        """meta_extra config should be merged into filter entries."""
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        # Customer should have combobox widget and endpoint
        customer = filters["customer"]
        assert customer["widget"] == "combobox"
        assert "endpoint" in customer

        # Date range filters should have range_group
        ship_from = filters["ship_date_from"]
        assert ship_from["range_group"] == "ship_date"

    def test_meta_search_fields(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        search_fields = [sf["field"] for sf in data["search_fields"]]

        assert "order_number" in search_fields
        assert "tender_number" in search_fields

    def test_meta_ordering_fields(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        ordering_fields = [of["field"] for of in data["ordering_fields"]]

        assert "order_number" in ordering_fields
        assert "ship_date" in ordering_fields
        assert "created_at" in ordering_fields

    def test_meta_date_filter_type(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/orders/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        assert filters["ship_date_from"]["type"] == "date"
        assert filters["ship_date_from"]["lookup"] == "gte"
        assert filters["ship_date_to"]["lookup"] == "lte"

    def test_meta_boolean_filter(self, api_client):
        """Boolean filters should include yes/no choices."""
        client = self._auth(api_client)
        data = client.get("/api/directory/orgunits/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        is_active = filters["is_active"]
        assert is_active["type"] == "boolean"
        assert len(is_active["choices"]) == 2


@pytest.mark.django_db
class TestOrgUnitMetaEndpoint:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_meta_returns_200(self, api_client):
        client = self._auth(api_client)
        response = client.get("/api/directory/orgunits/meta/")
        assert response.status_code == status.HTTP_200_OK

    def test_meta_filters(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/directory/orgunits/meta/").data
        filter_names = [f["name"] for f in data["filters"]]

        assert "unit_type" in filter_names
        assert "business_role" in filter_names
        assert "is_active" in filter_names
        assert "country" in filter_names
        # `parent` is intentionally hidden via meta_hidden_filters — the frontend
        # uses tree navigation instead of a parent filter input.
        assert "parent" not in filter_names

    def test_meta_choice_fields(self, api_client):
        """unit_type and business_role should have choices from model."""
        client = self._auth(api_client)
        data = client.get("/api/directory/orgunits/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        unit_type = filters["unit_type"]
        assert unit_type["type"] == "choice"
        assert "choices" in unit_type
        assert len(unit_type["choices"]) > 0

        business_role = filters["business_role"]
        assert business_role["type"] == "choice"
        assert "choices" in business_role

    def test_meta_extra_combobox(self, api_client):
        client = self._auth(api_client)
        data = client.get("/api/directory/orgunits/meta/").data
        filters = {f["name"]: f for f in data["filters"]}

        country = filters["country"]
        assert country["widget"] == "combobox"
        assert "/api/directory/countries/" in country["endpoint"]
