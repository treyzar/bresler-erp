import pytest
from django.db import IntegrityError

from apps.directory.models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Designer,
    Equipment,
    Intermediary,
    OrgUnit,
    PQ,
    TypeOfWork,
)

from .factories import (
    CityFactory,
    ContactFactory,
    CountryFactory,
    DeliveryTypeFactory,
    DesignerFactory,
    EquipmentFactory,
    IntermediaryFactory,
    OrgUnitFactory,
    PQFactory,
    TypeOfWorkFactory,
)


@pytest.mark.django_db
class TestCountry:
    def test_create(self):
        country = CountryFactory()
        assert country.pk is not None

    def test_str(self):
        country = CountryFactory(name="Россия")
        assert str(country) == "Россия"

    def test_unique_name(self):
        CountryFactory(name="Россия")
        with pytest.raises(IntegrityError):
            CountryFactory(name="Россия")

    def test_ordering(self):
        CountryFactory(name="Беларусь")
        CountryFactory(name="Австрия")
        countries = list(Country.objects.values_list("name", flat=True))
        assert countries == sorted(countries)


@pytest.mark.django_db
class TestCity:
    def test_create(self):
        city = CityFactory()
        assert city.pk is not None
        assert city.country is not None

    def test_str(self):
        city = CityFactory(name="Минск")
        assert str(city) == "Минск"

    def test_unique_together(self):
        country = CountryFactory()
        CityFactory(name="Минск", country=country)
        with pytest.raises(IntegrityError):
            CityFactory(name="Минск", country=country)

    def test_same_name_different_country(self):
        c1 = CountryFactory(name="Страна A")
        c2 = CountryFactory(name="Страна B")
        CityFactory(name="Город", country=c1)
        city2 = CityFactory(name="Город", country=c2)
        assert city2.pk is not None

    def test_cascade_delete(self):
        country = CountryFactory()
        CityFactory(name="Город", country=country)
        country.delete()
        assert City.objects.count() == 0


@pytest.mark.django_db
class TestOrgUnit:
    def test_create_root(self):
        node = OrgUnitFactory()
        assert node.pk is not None
        assert node.depth == 1

    def test_create_child(self):
        root = OrgUnitFactory(name="Root")
        child = OrgUnitFactory(name="Child", parent=root)
        assert child.pk is not None
        assert child.depth == 2

    def test_str(self):
        node = OrgUnitFactory(name="Компания")
        assert str(node) == "Компания"

    def test_get_children(self):
        root = OrgUnitFactory(name="Root")
        OrgUnitFactory(name="Child 1", parent=root)
        OrgUnitFactory(name="Child 2", parent=root)
        children = root.get_children()
        assert children.count() == 2

    def test_get_ancestors(self):
        root = OrgUnitFactory(name="Root")
        child = OrgUnitFactory(name="Child", parent=root)
        grandchild = OrgUnitFactory(name="Grandchild", parent=child)
        ancestors = grandchild.get_ancestors()
        assert ancestors.count() == 2
        names = list(ancestors.values_list("name", flat=True))
        assert "Root" in names
        assert "Child" in names

    def test_depth_tracking(self):
        root = OrgUnitFactory(name="Root")
        child = OrgUnitFactory(name="Child", parent=root)
        grandchild = OrgUnitFactory(name="Grandchild", parent=child)
        assert root.depth == 1
        assert child.depth == 2
        assert grandchild.depth == 3

    def test_previous_names_signal(self):
        node = OrgUnitFactory(name="Old Name")
        node.name = "New Name"
        node.save()
        node.refresh_from_db()
        assert "Old Name" in node.previous_names

    def test_previous_names_no_change(self):
        node = OrgUnitFactory(name="Same Name")
        node.save()
        node.refresh_from_db()
        assert node.previous_names == []

    def test_history_tracking(self):
        node = OrgUnitFactory(name="Original")
        node.name = "Updated"
        node.save()
        assert node.history.count() == 2


@pytest.mark.django_db
class TestContact:
    def test_create(self):
        contact = ContactFactory()
        assert contact.pk is not None

    def test_str(self):
        contact = ContactFactory(full_name="Иванов Иван")
        assert str(contact) == "Иванов Иван"

    def test_m2m_org_units(self):
        org1 = OrgUnitFactory(name="Org 1")
        org2 = OrgUnitFactory(name="Org 2")
        contact = ContactFactory(org_units=[org1, org2])
        assert contact.org_units.count() == 2


@pytest.mark.django_db
class TestEquipment:
    def test_create(self):
        eq = EquipmentFactory()
        assert eq.pk is not None

    def test_str(self):
        eq = EquipmentFactory(name="Насос")
        assert str(eq) == "Насос"

    def test_unique_name(self):
        EquipmentFactory(name="Насос")
        with pytest.raises(IntegrityError):
            EquipmentFactory(name="Насос")


@pytest.mark.django_db
class TestTypeOfWork:
    def test_create(self):
        tow = TypeOfWorkFactory()
        assert tow.pk is not None

    def test_str(self):
        tow = TypeOfWorkFactory(name="Монтаж")
        assert str(tow) == "Монтаж"

    def test_unique_name(self):
        TypeOfWorkFactory(name="Монтаж")
        with pytest.raises(IntegrityError):
            TypeOfWorkFactory(name="Монтаж")


@pytest.mark.django_db
class TestDeliveryType:
    def test_create(self):
        dt = DeliveryTypeFactory()
        assert dt.pk is not None

    def test_str(self):
        dt = DeliveryTypeFactory(name="Самовывоз")
        assert str(dt) == "Самовывоз"

    def test_unique_name(self):
        DeliveryTypeFactory(name="Самовывоз")
        with pytest.raises(IntegrityError):
            DeliveryTypeFactory(name="Самовывоз")


@pytest.mark.django_db
class TestIntermediary:
    def test_create(self):
        interm = IntermediaryFactory()
        assert interm.pk is not None

    def test_str(self):
        interm = IntermediaryFactory(name="Агент")
        assert str(interm) == "Агент"

    def test_unique_name(self):
        IntermediaryFactory(name="Агент")
        with pytest.raises(IntegrityError):
            IntermediaryFactory(name="Агент")


@pytest.mark.django_db
class TestDesigner:
    def test_create(self):
        d = DesignerFactory()
        assert d.pk is not None

    def test_str(self):
        d = DesignerFactory(name="НИИ")
        assert str(d) == "НИИ"

    def test_unique_name(self):
        DesignerFactory(name="НИИ")
        with pytest.raises(IntegrityError):
            DesignerFactory(name="НИИ")


@pytest.mark.django_db
class TestPQ:
    def test_create(self):
        pq = PQFactory()
        assert pq.pk is not None

    def test_str(self):
        pq = PQFactory(name="PQ-001")
        assert str(pq) == "PQ-001"

    def test_unique_name(self):
        PQFactory(name="PQ-001")
        with pytest.raises(IntegrityError):
            PQFactory(name="PQ-001")

    def test_previous_names_signal(self):
        pq = PQFactory(name="Old PQ")
        pq.name = "New PQ"
        pq.save()
        pq.refresh_from_db()
        assert "Old PQ" in pq.previous_names

    def test_history_tracking(self):
        pq = PQFactory(name="Original")
        pq.name = "Updated"
        pq.save()
        assert pq.history.count() == 2
