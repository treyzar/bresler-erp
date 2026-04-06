import pytest
from decimal import Decimal

from django.urls import reverse
from rest_framework import status

from apps.orders.tests.factories import OrderFactory, OrderParticipantFactory
from apps.users.tests.factories import UserFactory
from apps.specs.models import CommercialOffer
from .factories import (
    CommercialOfferFactory,
    SpecificationFactory,
    SpecificationLineFactory,
    ParticipantContactFactory,
)


@pytest.mark.django_db
class TestCommercialOfferAPI:
    def test_list_by_order(self, authenticated_client, user):
        order = OrderFactory()
        p = OrderParticipantFactory(order=order, order_index=1)
        CommercialOfferFactory(order=order, participant=p, manager=user)
        CommercialOfferFactory(order=order, participant=p, manager=user)
        # Another order's offer — should not appear
        CommercialOfferFactory()

        url = reverse("order-offers-list", kwargs={"order_pk": order.pk})
        resp = authenticated_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2

    def test_create(self, authenticated_client):
        order = OrderFactory()
        p = OrderParticipantFactory(order=order, order_index=1)

        url = reverse("order-offers-list", kwargs={"order_pk": order.pk})
        resp = authenticated_client.post(url, {
            "participant": p.pk,
            "date": "2026-04-01",
            "valid_days": 30,
            "vat_rate": "20.00",
            "payment_terms": "50_50",
            "manufacturing_period": "60-90",
            "warranty_months": 60,
        })

        assert resp.status_code == status.HTTP_201_CREATED
        offer = CommercialOffer.objects.filter(order=order).first()
        assert offer is not None
        assert offer.version == 1
        assert offer.offer_number == f"{order.order_number}/1-1"

    def test_retrieve(self, authenticated_client):
        mgr = UserFactory()
        offer = CommercialOfferFactory(manager=mgr)
        SpecificationFactory(offer=offer)

        url = reverse("offers-detail", kwargs={"pk": offer.pk})
        resp = authenticated_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["offer_number"] == offer.offer_number
        assert "specification" in resp.data
        assert "work_items" in resp.data

    def test_copy(self, authenticated_client):
        order = OrderFactory()
        p = OrderParticipantFactory(order=order, order_index=1)
        mgr = UserFactory()
        source = CommercialOfferFactory(
            order=order, participant=p, manager=mgr,
            warranty_months=36,
        )
        SpecificationFactory(offer=source)

        url = reverse("offers-copy", kwargs={"pk": source.pk})
        resp = authenticated_client.post(url, {"participant_id": p.pk})

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["version"] == 2
        assert resp.data["warranty_months"] == 36

    def test_update_specification(self, authenticated_client):
        mgr = UserFactory()
        offer = CommercialOfferFactory(manager=mgr)
        spec = SpecificationFactory(offer=offer)
        line = SpecificationLineFactory(
            specification=spec, name="Терминал",
            quantity=1, unit_price=Decimal("50000"),
        )

        url = reverse("offers-specification", kwargs={"pk": offer.pk})
        resp = authenticated_client.patch(url, {
            "lines": [
                {"id": line.id, "quantity": 3, "unit_price": "50000.00", "name": "Терминал", "line_number": 1},
            ]
        }, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_amount"] == "150000.00"


@pytest.mark.django_db
class TestParticipantContactAPI:
    def test_list(self, authenticated_client):
        p = OrderParticipantFactory()
        ParticipantContactFactory(participant=p)
        ParticipantContactFactory(participant=p)

        url = reverse("participant-contacts-list", kwargs={"participant_pk": p.pk})
        resp = authenticated_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2

    def test_create(self, authenticated_client):
        from apps.directory.tests.factories import ContactFactory

        p = OrderParticipantFactory()
        contact = ContactFactory()

        url = reverse("participant-contacts-list", kwargs={"participant_pk": p.pk})
        resp = authenticated_client.post(
            url, {"participant": p.pk, "contact": contact.pk, "is_primary": True},
        )

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["is_primary"] is True
