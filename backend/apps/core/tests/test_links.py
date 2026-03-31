"""Tests for Linked Documents."""

import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework import status

from apps.core.links import DocumentLink
from apps.orders.tests.factories import OrderFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestDocumentLinkAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_create_link(self, api_client):
        order1 = OrderFactory()
        order2 = OrderFactory()
        client = self._auth(api_client)

        resp = client.post("/api/links/", {
            "source_model": "order",
            "source_id": order1.pk,
            "target_model": "order",
            "target_id": order2.pk,
        }, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert DocumentLink.objects.count() == 1

    def test_list_links(self, api_client):
        order1 = OrderFactory()
        order2 = OrderFactory()
        order3 = OrderFactory()
        ct = ContentType.objects.get_for_model(order1)

        DocumentLink.objects.create(
            source_type=ct, source_id=order1.pk,
            target_type=ct, target_id=order2.pk,
        )
        DocumentLink.objects.create(
            source_type=ct, source_id=order1.pk,
            target_type=ct, target_id=order3.pk,
        )

        client = self._auth(api_client)
        resp = client.get("/api/links/", {"source_model": "order", "source_id": order1.pk})
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) == 2

    def test_bidirectional_query(self, api_client):
        """Querying by either source or target should return the link."""
        order1 = OrderFactory()
        order2 = OrderFactory()
        ct = ContentType.objects.get_for_model(order1)
        DocumentLink.objects.create(
            source_type=ct, source_id=order1.pk,
            target_type=ct, target_id=order2.pk,
        )

        client = self._auth(api_client)
        # Query from target side
        resp = client.get("/api/links/", {"source_model": "order", "source_id": order2.pk})
        results = resp.data.get("results", resp.data)
        assert len(results) == 1

    def test_delete_link(self, api_client):
        order1 = OrderFactory()
        order2 = OrderFactory()
        ct = ContentType.objects.get_for_model(order1)
        link = DocumentLink.objects.create(
            source_type=ct, source_id=order1.pk,
            target_type=ct, target_id=order2.pk,
        )
        client = self._auth(api_client)
        resp = client.delete(f"/api/links/{link.pk}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert DocumentLink.objects.count() == 0

    def test_unique_constraint(self, api_client):
        order1 = OrderFactory()
        order2 = OrderFactory()
        client = self._auth(api_client)

        client.post("/api/links/", {
            "source_model": "order", "source_id": order1.pk,
            "target_model": "order", "target_id": order2.pk,
        }, format="json")
        resp = client.post("/api/links/", {
            "source_model": "order", "source_id": order1.pk,
            "target_model": "order", "target_id": order2.pk,
        }, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
