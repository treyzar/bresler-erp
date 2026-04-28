from datetime import date
from decimal import Decimal

import factory

from apps.orders.tests.factories import OrderFactory, OrderParticipantFactory
from apps.specs.models import (
    CommercialOffer,
    OfferWorkItem,
    ParticipantContact,
    Specification,
    SpecificationLine,
)
from apps.users.tests.factories import UserFactory


class CommercialOfferFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CommercialOffer

    order = factory.SubFactory(OrderFactory)
    participant = factory.SubFactory(OrderParticipantFactory)
    offer_number = factory.Sequence(lambda n: f"1/{n + 1}-1")
    version = 1
    date = factory.LazyFunction(date.today)
    valid_days = 30
    manager = factory.SubFactory(UserFactory)
    executor = factory.SubFactory(UserFactory)
    status = CommercialOffer.Status.DRAFT


class OfferWorkItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OfferWorkItem

    offer = factory.SubFactory(CommercialOfferFactory)
    work_type = factory.SubFactory("apps.directory.tests.factories.TypeOfWorkFactory")
    included = True
    days = 15
    specialists = 1
    trips = 1


class SpecificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Specification

    offer = factory.SubFactory(CommercialOfferFactory)


class SpecificationLineFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SpecificationLine

    specification = factory.SubFactory(SpecificationFactory)
    line_number = factory.Sequence(lambda n: n + 1)
    name = factory.Sequence(lambda n: f"Позиция {n + 1}")
    quantity = 1
    unit_price = Decimal("10000.00")


class ParticipantContactFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ParticipantContact

    participant = factory.SubFactory(OrderParticipantFactory)
    contact = factory.SubFactory("apps.directory.tests.factories.ContactFactory")
    is_primary = False
