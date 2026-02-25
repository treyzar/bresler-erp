import factory

from apps.directory.models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)


class CountryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Country

    name = factory.Sequence(lambda n: f"Страна {n}")
    code = factory.Sequence(lambda n: f"C{n:02d}")


class CityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = City

    name = factory.Sequence(lambda n: f"Город {n}")
    country = factory.SubFactory(CountryFactory)


class OrgUnitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrgUnit

    name = factory.Sequence(lambda n: f"OrgUnit {n}")
    full_name = factory.LazyAttribute(lambda obj: f"Full {obj.name}")
    unit_type = OrgUnit.UnitType.COMPANY
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        parent = kwargs.pop("parent", None)
        if parent is not None:
            return parent.add_child(**kwargs)
        return model_class.add_root(**kwargs)


class ContactFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Contact
        skip_postgeneration_save = True

    full_name = factory.Faker("name", locale="ru_RU")
    position = factory.Faker("job", locale="ru_RU")
    email = factory.Faker("email")
    phone = factory.Faker("phone_number", locale="ru_RU")

    @factory.post_generation
    def org_units(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.org_units.add(*extracted)


class EquipmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Equipment

    name = factory.Sequence(lambda n: f"Оборудование {n}")


class TypeOfWorkFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TypeOfWork

    name = factory.Sequence(lambda n: f"Вид работ {n}")


class DeliveryTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DeliveryType

    name = factory.Sequence(lambda n: f"Тип доставки {n}")


class FacilityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Facility

    name = factory.Sequence(lambda n: f"Объект {n}")
    org_unit = factory.SubFactory(OrgUnitFactory)
    is_active = True
