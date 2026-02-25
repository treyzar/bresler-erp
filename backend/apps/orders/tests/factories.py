import factory
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.directory.tests.factories import (
    ContactFactory,
    CountryFactory,
    EquipmentFactory,
    OrgUnitFactory,
    TypeOfWorkFactory,
)
from apps.orders.models import Contract, Order, OrderFile, OrderOrgUnit, OrderParticipant
from apps.users.tests.factories import UserFactory


class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order
        skip_postgeneration_save = True

    order_number = factory.Sequence(lambda n: n + 1)
    status = Order.Status.NEW
    customer_org_unit = factory.SubFactory(OrgUnitFactory)
    intermediary = factory.SubFactory(OrgUnitFactory)
    designer = factory.SubFactory(OrgUnitFactory)
    country = factory.SubFactory(CountryFactory)

    @factory.post_generation
    def contacts(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.contacts.add(*extracted)

    @factory.post_generation
    def managers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.managers.add(*extracted)

    @factory.post_generation
    def equipments(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.equipments.add(*extracted)

    @factory.post_generation
    def works(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.works.add(*extracted)


class ContractFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Contract

    order = factory.SubFactory(OrderFactory)
    contract_number = factory.Sequence(lambda n: f"CONTRACT-{n:04d}")
    status = Contract.Status.NOT_PAID
    advance_percent = 0
    intermediate_percent = 0
    post_payment_percent = 0


class OrderFileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderFile

    order = factory.SubFactory(OrderFactory)
    file = factory.LazyFunction(
        lambda: SimpleUploadedFile("test.pdf", b"file content", content_type="application/pdf")
    )
    original_name = factory.Sequence(lambda n: f"document_{n}.pdf")
    file_size = 1024


class OrderOrgUnitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderOrgUnit

    order = factory.SubFactory(OrderFactory)
    org_unit = factory.SubFactory(OrgUnitFactory)
    role = "customer"
    order_index = 0


class OrderParticipantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderParticipant

    order = factory.SubFactory(OrderFactory)
    org_unit = factory.SubFactory(OrgUnitFactory)
    order_index = 0
