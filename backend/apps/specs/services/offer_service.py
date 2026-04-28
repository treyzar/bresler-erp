"""Service layer for CommercialOffer operations."""

from datetime import date

from django.db import transaction
from django.db.models import Max

from apps.orders.models import Order, OrderParticipant
from apps.specs.models import CommercialOffer, OfferWorkItem, Specification, SpecificationLine


def next_version(order: Order, participant: OrderParticipant) -> int:
    """Get next version number for offer by (order, participant) pair."""
    max_ver = (
        CommercialOffer.objects.filter(
            order=order,
            participant=participant,
        ).aggregate(m=Max("version"))["m"]
        or 0
    )
    return max_ver + 1


def auto_number(order: Order, participant: OrderParticipant, version: int) -> str:
    """Generate offer number: {order_number}/{participant_index}-{version}.

    Example: 4070/1-1, 4070/2-3
    """
    return f"{order.order_number}/{participant.order_index}-{version}"


@transaction.atomic
def create_offer(
    order: Order,
    participant: OrderParticipant,
    user,
    **kwargs,
) -> CommercialOffer:
    """Create a new CommercialOffer with auto-generated number and version."""
    version = next_version(order, participant)
    offer_number = auto_number(order, participant, version)

    offer = CommercialOffer.objects.create(
        order=order,
        participant=participant,
        offer_number=offer_number,
        version=version,
        date=kwargs.get("date", date.today()),
        manager=kwargs.get("manager", user),
        executor=kwargs.get("executor", user),
        **{k: v for k, v in kwargs.items() if k not in ("date", "manager", "executor")},
    )

    # Auto-create empty specification
    Specification.objects.create(offer=offer)

    # Auto-create work items from order's selected works
    for work_type in order.works.all():
        OfferWorkItem.objects.create(
            offer=offer,
            work_type=work_type,
            included=True,
        )

    return offer


@transaction.atomic
def create_from_template(source: CommercialOffer, participant: OrderParticipant, user) -> CommercialOffer:
    """Create a new offer by copying from an existing one ('Заполнить на основании')."""
    version = next_version(source.order, participant)
    offer_number = auto_number(source.order, participant, version)

    offer = CommercialOffer.objects.create(
        order=source.order,
        participant=participant,
        offer_number=offer_number,
        version=version,
        date=date.today(),
        based_on=source,
        manager=user,
        executor=user,
        vat_rate=source.vat_rate,
        payment_terms=source.payment_terms,
        advance_percent=source.advance_percent,
        pre_shipment_percent=source.pre_shipment_percent,
        post_payment_percent=source.post_payment_percent,
        manufacturing_period=source.manufacturing_period,
        warranty_months=source.warranty_months,
        delivery_included=source.delivery_included,
        delivery_city=source.delivery_city,
        additional_conditions=source.additional_conditions,
        valid_days=source.valid_days,
    )

    # Copy work items
    for wi in source.work_items.all():
        OfferWorkItem.objects.create(
            offer=offer,
            work_type=wi.work_type,
            included=wi.included,
            days=wi.days,
            specialists=wi.specialists,
            trips=wi.trips,
        )

    # Copy specification with lines
    spec = Specification.objects.create(offer=offer)
    for line in SpecificationLine.objects.filter(specification=source.specification):
        SpecificationLine.objects.create(
            specification=spec,
            line_number=line.line_number,
            product=line.product,
            device_rza=line.device_rza,
            mod_rza=line.mod_rza,
            name=line.name,
            quantity=line.quantity,
            unit_price=line.unit_price,
            delivery_date=line.delivery_date,
            note=line.note,
        )
    spec.recalculate()

    return offer
