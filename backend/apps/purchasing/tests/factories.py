import factory
from factory.django import DjangoModelFactory

from apps.purchasing.models import (
    PurchaseOrder,
    PurchaseOrderLine,
    PurchasePayment,
    PurchaseRequest,
    PurchaseRequestLine,
    StockItem,
    SupplierConditions,
)


class StockItemFactory(DjangoModelFactory):
    class Meta:
        model = StockItem

    product = factory.SubFactory("apps.devices.tests.factories.ProductFactory")
    quantity = 100
    reserved = 0


class PurchaseRequestFactory(DjangoModelFactory):
    class Meta:
        model = PurchaseRequest

    order = factory.SubFactory("apps.orders.tests.factories.OrderFactory")
    created_by = factory.SubFactory("apps.users.tests.factories.UserFactory")
    status = PurchaseRequest.Status.DRAFT
    note = "Test request"


class PurchaseRequestLineFactory(DjangoModelFactory):
    class Meta:
        model = PurchaseRequestLine

    request = factory.SubFactory(PurchaseRequestFactory)
    name = factory.Sequence(lambda n: f"Component {n}")
    quantity = 5
    target_description = "Шкаф №1"


class SupplierFactory(DjangoModelFactory):
    """OrgUnit with supplier role."""
    class Meta:
        model = "directory.OrgUnit"

    name = factory.Sequence(lambda n: f"Supplier {n}")
    full_name = factory.LazyAttribute(lambda obj: f"Full {obj.name}")
    unit_type = "company"
    business_role = "supplier"
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class.add_root(**kwargs)


class PurchaseOrderFactory(DjangoModelFactory):
    class Meta:
        model = PurchaseOrder

    supplier = factory.SubFactory(SupplierFactory)
    purchaser = factory.SubFactory("apps.users.tests.factories.UserFactory")
    status = PurchaseOrder.Status.DRAFT


class PurchaseOrderLineFactory(DjangoModelFactory):
    class Meta:
        model = PurchaseOrderLine

    purchase_order = factory.SubFactory(PurchaseOrderFactory)
    name = factory.Sequence(lambda n: f"Item {n}")
    quantity = 10
    unit_price = "100.00"


class SupplierConditionsFactory(DjangoModelFactory):
    class Meta:
        model = SupplierConditions

    supplier = factory.SubFactory(SupplierFactory)
    discount_percent = "5.00"
    payment_terms = "50% аванс, 50% постоплата"


class PurchasePaymentFactory(DjangoModelFactory):
    class Meta:
        model = PurchasePayment

    purchase_order = factory.SubFactory(PurchaseOrderFactory)
    amount = "50000.00"
    status = PurchasePayment.Status.PENDING_APPROVAL
    invoice_number = factory.Sequence(lambda n: f"INV-{n:04d}")
