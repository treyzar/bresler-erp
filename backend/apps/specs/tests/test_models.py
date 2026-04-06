import pytest
from datetime import date, timedelta
from decimal import Decimal

from apps.specs.models import CommercialOffer, Specification, SpecificationLine
from .factories import (
    CommercialOfferFactory,
    OfferWorkItemFactory,
    SpecificationFactory,
    SpecificationLineFactory,
    ParticipantContactFactory,
)


@pytest.mark.django_db
class TestCommercialOffer:
    def test_create(self):
        offer = CommercialOfferFactory()
        assert offer.pk is not None
        assert offer.version == 1

    def test_valid_until_auto_calculated(self):
        offer = CommercialOfferFactory(date=date(2026, 1, 1), valid_days=30)
        assert offer.valid_until == date(2026, 1, 31)

    def test_payment_template_auto_fills_percents(self):
        offer = CommercialOfferFactory(payment_terms=CommercialOffer.PaymentTerms.FIFTY_FIFTY)
        assert offer.advance_percent == Decimal("50")
        assert offer.pre_shipment_percent == Decimal("50")
        assert offer.post_payment_percent == Decimal("0")

    def test_payment_template_post_7(self):
        offer = CommercialOfferFactory(payment_terms=CommercialOffer.PaymentTerms.POST_7)
        assert offer.advance_percent == Decimal("0")
        assert offer.post_payment_percent == Decimal("100")

    def test_custom_payment_preserves_values(self):
        offer = CommercialOfferFactory(
            payment_terms=CommercialOffer.PaymentTerms.CUSTOM,
            advance_percent=Decimal("30"),
            pre_shipment_percent=Decimal("20"),
            post_payment_percent=Decimal("50"),
        )
        assert offer.advance_percent == Decimal("30")
        assert offer.pre_shipment_percent == Decimal("20")
        assert offer.post_payment_percent == Decimal("50")

    def test_shipment_condition_text_prepaid(self):
        offer = CommercialOfferFactory(payment_terms=CommercialOffer.PaymentTerms.FIFTY_FIFTY)
        assert "полной оплаты" in offer.shipment_condition_text

    def test_shipment_condition_text_postpaid(self):
        offer = CommercialOfferFactory(payment_terms=CommercialOffer.PaymentTerms.POST_30)
        assert "уведомления о готовности" in offer.shipment_condition_text

    def test_str(self):
        offer = CommercialOfferFactory(offer_number="4070/1-1")
        assert str(offer) == "КП 4070/1-1"


@pytest.mark.django_db
class TestOfferWorkItem:
    def test_create(self):
        wi = OfferWorkItemFactory()
        assert wi.included is True
        assert wi.days == 15
        assert wi.specialists == 1
        assert wi.trips == 1

    def test_str(self):
        wi = OfferWorkItemFactory(included=True)
        assert "✓" in str(wi)


@pytest.mark.django_db
class TestSpecification:
    def test_create(self):
        spec = SpecificationFactory()
        assert spec.pk is not None
        assert spec.total_amount == Decimal("0.00")

    def test_recalculate(self):
        spec = SpecificationFactory()
        SpecificationLineFactory(specification=spec, quantity=2, unit_price=Decimal("5000.00"))
        SpecificationLineFactory(specification=spec, quantity=1, unit_price=Decimal("3000.00"))
        spec.recalculate()
        assert spec.total_amount == Decimal("13000.00")
        # VAT 20% by default
        assert spec.total_amount_with_vat == Decimal("15600.00")


@pytest.mark.django_db
class TestSpecificationLine:
    def test_total_price_auto_calculated(self):
        line = SpecificationLineFactory(quantity=3, unit_price=Decimal("1000.50"))
        assert line.total_price == Decimal("3001.50")

    def test_str(self):
        line = SpecificationLineFactory(line_number=1, name="Терминал", quantity=2)
        assert "1. Терминал ×2" in str(line)


@pytest.mark.django_db
class TestParticipantContact:
    def test_create(self):
        pc = ParticipantContactFactory()
        assert pc.pk is not None
        assert pc.is_primary is False
