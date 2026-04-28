"""Service layer for Specification operations."""

from decimal import Decimal

from django.db import transaction

from apps.specs.models import Specification, SpecificationLine


def recalculate_totals(specification: Specification) -> None:
    """Recalculate specification totals from lines."""
    specification.recalculate()


@transaction.atomic
def fill_from_offer(target: Specification, source_offer) -> None:
    """Fill specification lines from another offer's specification."""
    try:
        source_spec = source_offer.specification
    except Specification.DoesNotExist:
        return

    # Clear existing lines
    target.lines.all().delete()

    for line in source_spec.lines.all():
        SpecificationLine.objects.create(
            specification=target,
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

    target.recalculate()


@transaction.atomic
def fill_from_products(specification: Specification, product_ids: list[int]) -> None:
    """Fill specification lines from product catalog."""
    from apps.devices.models.catalog import Product

    products = Product.objects.filter(id__in=product_ids, is_active=True)

    # Start numbering after existing lines
    last_num = specification.lines.aggregate(m=__import__("django").db.models.Max("line_number"))["m"] or 0

    for i, product in enumerate(products, start=1):
        SpecificationLine.objects.create(
            specification=specification,
            line_number=last_num + i,
            product=product,
            name=product.name,
            quantity=1,
            unit_price=product.base_price or Decimal("0.00"),
        )

    specification.recalculate()
