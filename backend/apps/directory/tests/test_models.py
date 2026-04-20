import pytest
from django.db import IntegrityError

from apps.directory.models import (
    City,
    Contact,
    ContactEmployment,
    Country,
    DeliveryType,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)

from .factories import (
    CityFactory,
    ContactFactory,
    CountryFactory,
    DeliveryTypeFactory,
    EquipmentFactory,
    FacilityFactory,
    OrgUnitFactory,
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

    def test_unit_type_choices(self):
        for type_val, _ in OrgUnit.UnitType.choices:
            node = OrgUnitFactory(unit_type=type_val)
            assert node.unit_type == type_val

    def test_business_role_choices(self):
        for role_val, _ in OrgUnit.BusinessRole.choices:
            node = OrgUnitFactory(business_role=role_val)
            assert node.business_role == role_val


@pytest.mark.django_db
class TestContact:
    def test_create(self):
        contact = ContactFactory()
        assert contact.pk is not None

    def test_str(self):
        contact = ContactFactory(full_name="Иванов Иван")
        assert str(contact) == "Иванов Иван"

    def test_org_unit_fk(self):
        org = OrgUnitFactory(name="Org 1")
        contact = ContactFactory(org_unit=org)
        assert contact.org_unit_id == org.id


@pytest.mark.django_db
class TestContactEmploymentAutoHistory:
    def test_create_with_org_unit_opens_initial_employment(self):
        org = OrgUnitFactory(name="Org A")
        contact = Contact.objects.create(
            full_name="Ivanov",
            position="Engineer",
            address="Addr 1",
            org_unit=org,
        )
        employments = list(contact.employments.all())
        assert len(employments) == 1
        e = employments[0]
        assert e.is_current is True
        assert e.org_unit_id == org.id
        assert e.position == "Engineer"
        assert e.address == "Addr 1"
        assert e.start_date is not None
        assert e.end_date is None

    def test_create_without_org_unit_creates_no_record(self):
        contact = Contact.objects.create(full_name="NoOrg")
        assert contact.employments.count() == 0

    def test_change_org_unit_closes_and_opens(self):
        org_a = OrgUnitFactory(name="A")
        org_b = OrgUnitFactory(name="B")
        contact = Contact.objects.create(full_name="X", org_unit=org_a, position="p1")

        contact.org_unit = org_b
        contact.save()

        records = list(contact.employments.order_by("id"))
        assert len(records) == 2
        assert records[0].is_current is False
        assert records[0].end_date is not None
        assert records[0].org_unit_id == org_a.id
        assert records[1].is_current is True
        assert records[1].org_unit_id == org_b.id

    def test_change_position_only_triggers_new_record(self):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org, position="p1")

        contact.position = "p2"
        contact.save()

        records = list(contact.employments.order_by("id"))
        assert len(records) == 2
        assert records[0].is_current is False
        assert records[1].is_current is True
        assert records[1].position == "p2"

    def test_change_address_only_triggers_new_record(self):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org, address="addr1")

        contact.address = "addr2"
        contact.save()

        records = list(contact.employments.order_by("id"))
        assert len(records) == 2
        assert records[1].address == "addr2"
        assert records[1].is_current is True

    def test_unrelated_field_change_does_not_touch_history(self):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org, position="p1")
        assert contact.employments.count() == 1

        contact.phone = "+7 123"
        contact.email = "x@y.z"
        contact.save()

        assert contact.employments.count() == 1
        assert contact.employments.first().is_current is True

    def test_clear_org_unit_closes_current_without_opening(self):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org)

        contact.org_unit = None
        contact.save()

        records = list(contact.employments.all())
        assert len(records) == 1
        assert records[0].is_current is False
        assert records[0].end_date is not None


@pytest.mark.django_db
class TestContactEmploymentAPIReadOnly:
    """Write endpoints should be rejected — history is auto-managed."""

    def test_post_is_disallowed(self, authenticated_client):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org)
        resp = authenticated_client.post(
            "/api/directory/contact-employments/",
            {"contact": contact.id, "org_unit": org.id, "position": "p"},
            format="json",
        )
        assert resp.status_code in (403, 405)

    def test_delete_is_disallowed(self, authenticated_client):
        org = OrgUnitFactory(name="A")
        contact = Contact.objects.create(full_name="X", org_unit=org)
        emp = contact.employments.first()
        resp = authenticated_client.delete(f"/api/directory/contact-employments/{emp.id}/")
        assert resp.status_code in (403, 405)
        assert ContactEmployment.objects.filter(pk=emp.id).exists()


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
class TestFacility:
    def test_create(self):
        facility = FacilityFactory()
        assert facility.pk is not None
        assert facility.org_unit is not None

    def test_str(self):
        facility = FacilityFactory(name="РП-10")
        assert str(facility) == "РП-10"

    def test_without_org_unit(self):
        facility = FacilityFactory(org_unit=None)
        assert facility.pk is not None
        assert facility.org_unit is None

    def test_is_active_default(self):
        facility = FacilityFactory()
        assert facility.is_active is True

    def test_history_tracking(self):
        facility = FacilityFactory(name="Old Name")
        facility.name = "New Name"
        facility.save()
        assert facility.history.count() == 2

    def test_org_unit_protect(self):
        facility = FacilityFactory()
        with pytest.raises(Exception):
            facility.org_unit.delete()

    def test_ordering(self):
        FacilityFactory(name="Б-объект")
        FacilityFactory(name="А-объект")
        names = list(Facility.objects.values_list("name", flat=True))
        assert names == sorted(names)
