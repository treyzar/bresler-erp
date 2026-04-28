from decimal import Decimal

import pytest

from apps.orders.tests.factories import OrderFactory, OrderParticipantFactory
from apps.specs.models import Specification
from apps.specs.services import offer_service, specification_service
from apps.users.tests.factories import UserFactory

from .factories import (
    CommercialOfferFactory,
    SpecificationFactory,
    SpecificationLineFactory,
)


@pytest.mark.django_db
class TestOfferService:
    def test_create_offer(self):
        order = OrderFactory()
        participant = OrderParticipantFactory(order=order, order_index=1)
        user = UserFactory()

        offer = offer_service.create_offer(order, participant, user)

        assert offer.version == 1
        assert offer.offer_number == f"{order.order_number}/1-1"
        assert offer.manager == user
        assert Specification.objects.filter(offer=offer).exists()

    def test_next_version_increments(self):
        order = OrderFactory()
        participant = OrderParticipantFactory(order=order, order_index=1)
        user = UserFactory()

        offer1 = offer_service.create_offer(order, participant, user)
        assert offer1.version == 1

        offer2 = offer_service.create_offer(order, participant, user)
        assert offer2.version == 2
        assert offer2.offer_number == f"{order.order_number}/1-2"

    def test_auto_number_uses_participant_index(self):
        order = OrderFactory()
        p1 = OrderParticipantFactory(order=order, order_index=1)
        p2 = OrderParticipantFactory(order=order, order_index=2)
        user = UserFactory()

        o1 = offer_service.create_offer(order, p1, user)
        o2 = offer_service.create_offer(order, p2, user)

        assert o1.offer_number == f"{order.order_number}/1-1"
        assert o2.offer_number == f"{order.order_number}/2-1"

    def test_create_from_template(self):
        order = OrderFactory()
        p1 = OrderParticipantFactory(order=order, order_index=1)
        user = UserFactory()

        source = offer_service.create_offer(
            order,
            p1,
            user,
            warranty_months=36,
            delivery_included=True,
            delivery_city="Челябинск",
        )
        # Add spec lines to source
        SpecificationLineFactory(
            specification=source.specification,
            name="Терминал",
            quantity=2,
            unit_price=Decimal("50000"),
        )
        source.specification.recalculate()

        copy = offer_service.create_from_template(source, p1, user)

        assert copy.version == 2
        assert copy.based_on == source
        assert copy.warranty_months == 36
        assert copy.delivery_included is True
        assert copy.delivery_city == "Челябинск"
        assert copy.specification.lines.count() == 1
        assert copy.specification.total_amount == Decimal("100000.00")


@pytest.mark.django_db
class TestSpecificationService:
    def test_fill_from_offer(self):
        source_offer = CommercialOfferFactory()
        source_spec = SpecificationFactory(offer=source_offer)
        SpecificationLineFactory(specification=source_spec, name="A", quantity=1, unit_price=Decimal("100"))
        SpecificationLineFactory(specification=source_spec, name="B", quantity=2, unit_price=Decimal("200"))

        target_offer = CommercialOfferFactory()
        target_spec = SpecificationFactory(offer=target_offer)

        specification_service.fill_from_offer(target_spec, source_offer)

        assert target_spec.lines.count() == 2
        assert target_spec.total_amount == Decimal("500.00")

    def test_fill_from_products(self):
        from apps.devices.models.catalog import Product, ProductType

        pt = ProductType.objects.create(name="Терминал")
        p1 = Product.objects.create(
            name="Бреслер-0107",
            internal_code="BR-0107",
            product_type=pt,
            base_price=Decimal("75000"),
        )
        p2 = Product.objects.create(
            name="Бреслер-0207",
            internal_code="BR-0207",
            product_type=pt,
            base_price=Decimal("120000"),
        )

        offer = CommercialOfferFactory()
        spec = SpecificationFactory(offer=offer)

        specification_service.fill_from_products(spec, [p1.id, p2.id])

        assert spec.lines.count() == 2
        assert spec.total_amount == Decimal("195000.00")
        names = list(spec.lines.values_list("name", flat=True))
        assert "Бреслер-0107" in names
        assert "Бреслер-0207" in names
