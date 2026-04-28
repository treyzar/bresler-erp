import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.directory.models import OrgUnit
from apps.users.tests.factories import UserFactory

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


# ---------------------------------------------------------------------------
# OrgUnit ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrgUnitAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        OrgUnitFactory(name="Root 1")
        OrgUnitFactory(name="Root 2")
        url = reverse("directory:orgunit-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_list_returns_only_roots(self):
        root = OrgUnitFactory(name="Root")
        OrgUnitFactory(name="Child", parent=root)
        url = reverse("directory:orgunit-list")
        response = self.client.get(url)
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Root"

    def test_create_root(self):
        url = reverse("directory:orgunit-list")
        response = self.client.post(url, {"name": "New Root"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Root"
        assert response.data["depth"] == 1

    def test_create_child(self):
        root = OrgUnitFactory(name="Root")
        url = reverse("directory:orgunit-list")
        response = self.client.post(url, {"name": "Child", "parent": root.pk})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["depth"] == 2

    def test_retrieve(self):
        node = OrgUnitFactory(name="Test")
        url = reverse("directory:orgunit-detail", args=[node.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Test"

    def test_update(self):
        node = OrgUnitFactory(name="Old")
        url = reverse("directory:orgunit-detail", args=[node.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK
        node.refresh_from_db()
        assert node.name == "New"

    def test_delete(self):
        node = OrgUnitFactory(name="ToDelete")
        url = reverse("directory:orgunit-detail", args=[node.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not OrgUnit.objects.filter(pk=node.pk).exists()

    def test_children_action(self):
        root = OrgUnitFactory(name="Root")
        OrgUnitFactory(name="Child 1", parent=root)
        OrgUnitFactory(name="Child 2", parent=root)
        url = reverse("directory:orgunit-children", args=[root.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_ancestors_action(self):
        root = OrgUnitFactory(name="Root")
        child = OrgUnitFactory(name="Child", parent=root)
        url = reverse("directory:orgunit-ancestors", args=[child.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_tree_action(self):
        root = OrgUnitFactory(name="Root")
        OrgUnitFactory(name="Child", parent=root)
        url = reverse("directory:orgunit-tree")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Root"
        assert len(response.data[0]["children"]) == 1

    def test_search_action(self):
        OrgUnitFactory(name="Alpha Corp")
        OrgUnitFactory(name="Beta Inc")
        url = reverse("directory:orgunit-search")
        response = self.client.get(url, {"q": "Alpha"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Alpha Corp"

    def test_search_empty_query(self):
        url = reverse("directory:orgunit-search")
        response = self.client.get(url, {"q": ""})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_filter_by_unit_type(self):
        OrgUnitFactory(name="Company", unit_type=OrgUnit.UnitType.COMPANY)
        OrgUnitFactory(name="Branch", unit_type=OrgUnit.UnitType.BRANCH)
        url = reverse("directory:orgunit-list")
        response = self.client.get(url, {"unit_type": OrgUnit.UnitType.COMPANY})
        assert response.status_code == status.HTTP_200_OK
        assert all(r["unit_type"] == OrgUnit.UnitType.COMPANY for r in response.data["results"])

    def test_filter_by_business_role(self):
        OrgUnitFactory(name="Customer", business_role=OrgUnit.BusinessRole.CUSTOMER)
        OrgUnitFactory(name="Supplier", business_role=OrgUnit.BusinessRole.SUPPLIER)
        url = reverse("directory:orgunit-list")
        response = self.client.get(url, {"business_role": OrgUnit.BusinessRole.CUSTOMER})
        assert response.status_code == status.HTTP_200_OK
        assert all(r["business_role"] == OrgUnit.BusinessRole.CUSTOMER for r in response.data["results"])

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:orgunit-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Country ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCountryAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        CountryFactory.create_batch(3)
        url = reverse("directory:country-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        url = reverse("directory:country-list")
        response = self.client.post(url, {"name": "Россия", "code": "RU"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Россия"

    def test_retrieve(self):
        country = CountryFactory(name="Россия")
        url = reverse("directory:country-detail", args=[country.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Россия"

    def test_update(self):
        country = CountryFactory(name="Old")
        url = reverse("directory:country-detail", args=[country.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK
        country.refresh_from_db()
        assert country.name == "New"

    def test_delete(self):
        country = CountryFactory()
        url = reverse("directory:country-detail", args=[country.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        c1 = CountryFactory()
        c2 = CountryFactory()
        url = reverse("directory:country-bulk-delete")
        response = self.client.delete(url, {"ids": [c1.pk, c2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        CountryFactory(name="Россия")
        CountryFactory(name="Беларусь")
        url = reverse("directory:country-list")
        response = self.client.get(url, {"search": "Росс"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:country-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# City ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCityAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        CityFactory.create_batch(3)
        url = reverse("directory:city-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        country = CountryFactory()
        url = reverse("directory:city-list")
        response = self.client.post(url, {"name": "Минск", "country": country.pk})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Минск"

    def test_retrieve(self):
        city = CityFactory(name="Минск")
        url = reverse("directory:city-detail", args=[city.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Минск"

    def test_update(self):
        city = CityFactory(name="Old")
        url = reverse("directory:city-detail", args=[city.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK
        city.refresh_from_db()
        assert city.name == "New"

    def test_delete(self):
        city = CityFactory()
        url = reverse("directory:city-detail", args=[city.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        c1 = CityFactory()
        c2 = CityFactory()
        url = reverse("directory:city-bulk-delete")
        response = self.client.delete(url, {"ids": [c1.pk, c2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        CityFactory(name="Минск")
        CityFactory(name="Москва")
        url = reverse("directory:city-list")
        response = self.client.get(url, {"search": "Мин"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_by_country(self):
        country = CountryFactory()
        CityFactory(name="City A", country=country)
        CityFactory(name="City B")
        url = reverse("directory:city-list")
        response = self.client.get(url, {"country": country.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:city-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Contact ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestContactAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        ContactFactory.create_batch(3)
        url = reverse("directory:contact-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        url = reverse("directory:contact-list")
        response = self.client.post(url, {"full_name": "Иванов Иван"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["full_name"] == "Иванов Иван"

    def test_retrieve(self):
        contact = ContactFactory(full_name="Тестов Тест")
        url = reverse("directory:contact-detail", args=[contact.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["full_name"] == "Тестов Тест"

    def test_update(self):
        contact = ContactFactory(full_name="Old Name")
        url = reverse("directory:contact-detail", args=[contact.pk])
        response = self.client.patch(url, {"full_name": "New Name"})
        assert response.status_code == status.HTTP_200_OK
        contact.refresh_from_db()
        assert contact.full_name == "New Name"

    def test_delete(self):
        contact = ContactFactory()
        url = reverse("directory:contact-detail", args=[contact.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        c1 = ContactFactory()
        c2 = ContactFactory()
        url = reverse("directory:contact-bulk-delete")
        response = self.client.delete(url, {"ids": [c1.pk, c2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        ContactFactory(full_name="Иванов Иван")
        ContactFactory(full_name="Петров Петр")
        url = reverse("directory:contact-list")
        response = self.client.get(url, {"search": "Иванов"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_orgunits_action(self):
        org = OrgUnitFactory(name="Org")
        contact = ContactFactory(org_units=[org])
        url = reverse("directory:contact-orgunits", args=[contact.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_filter_by_org_unit(self):
        org = OrgUnitFactory(name="Org")
        ContactFactory(org_units=[org])
        ContactFactory()
        url = reverse("directory:contact-list")
        response = self.client.get(url, {"org_unit": org.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:contact-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Equipment ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestEquipmentAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        EquipmentFactory.create_batch(3)
        url = reverse("directory:equipment-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        url = reverse("directory:equipment-list")
        response = self.client.post(url, {"name": "Насос"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve(self):
        eq = EquipmentFactory(name="Насос")
        url = reverse("directory:equipment-detail", args=[eq.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Насос"

    def test_update(self):
        eq = EquipmentFactory(name="Old")
        url = reverse("directory:equipment-detail", args=[eq.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK

    def test_delete(self):
        eq = EquipmentFactory()
        url = reverse("directory:equipment-detail", args=[eq.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        e1 = EquipmentFactory()
        e2 = EquipmentFactory()
        url = reverse("directory:equipment-bulk-delete")
        response = self.client.delete(url, {"ids": [e1.pk, e2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        EquipmentFactory(name="Насос")
        EquipmentFactory(name="Компрессор")
        url = reverse("directory:equipment-list")
        response = self.client.get(url, {"search": "Насос"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:equipment-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# TypeOfWork ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestTypeOfWorkAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        TypeOfWorkFactory.create_batch(3)
        url = reverse("directory:work-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        url = reverse("directory:work-list")
        response = self.client.post(url, {"name": "Монтаж"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve(self):
        tow = TypeOfWorkFactory(name="Монтаж")
        url = reverse("directory:work-detail", args=[tow.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Монтаж"

    def test_update(self):
        tow = TypeOfWorkFactory(name="Old")
        url = reverse("directory:work-detail", args=[tow.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK

    def test_delete(self):
        tow = TypeOfWorkFactory()
        url = reverse("directory:work-detail", args=[tow.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        t1 = TypeOfWorkFactory()
        t2 = TypeOfWorkFactory()
        url = reverse("directory:work-bulk-delete")
        response = self.client.delete(url, {"ids": [t1.pk, t2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        TypeOfWorkFactory(name="Монтаж")
        TypeOfWorkFactory(name="Демонтаж")
        url = reverse("directory:work-list")
        response = self.client.get(url, {"search": "Монтаж"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:work-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# DeliveryType ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestDeliveryTypeAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        DeliveryTypeFactory.create_batch(3)
        url = reverse("directory:delivery-type-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        url = reverse("directory:delivery-type-list")
        response = self.client.post(url, {"name": "Самовывоз"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve(self):
        dt = DeliveryTypeFactory(name="Самовывоз")
        url = reverse("directory:delivery-type-detail", args=[dt.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Самовывоз"

    def test_update(self):
        dt = DeliveryTypeFactory(name="Old")
        url = reverse("directory:delivery-type-detail", args=[dt.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK

    def test_delete(self):
        dt = DeliveryTypeFactory()
        url = reverse("directory:delivery-type-detail", args=[dt.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        d1 = DeliveryTypeFactory()
        d2 = DeliveryTypeFactory()
        url = reverse("directory:delivery-type-bulk-delete")
        response = self.client.delete(url, {"ids": [d1.pk, d2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        DeliveryTypeFactory(name="Самовывоз")
        DeliveryTypeFactory(name="Доставка")
        url = reverse("directory:delivery-type-list")
        response = self.client.get(url, {"search": "Само"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:delivery-type-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Facility ViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestFacilityAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        FacilityFactory.create_batch(3)
        url = reverse("directory:facility-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self):
        org = OrgUnitFactory()
        url = reverse("directory:facility-list")
        response = self.client.post(url, {"name": "РП-10", "org_unit": org.pk})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "РП-10"

    def test_create_without_org_unit(self):
        url = reverse("directory:facility-list")
        response = self.client.post(url, {"name": "РП-10"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve(self):
        facility = FacilityFactory(name="РП-10")
        url = reverse("directory:facility-detail", args=[facility.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "РП-10"

    def test_update(self):
        facility = FacilityFactory(name="Old")
        url = reverse("directory:facility-detail", args=[facility.pk])
        response = self.client.patch(url, {"name": "New"})
        assert response.status_code == status.HTTP_200_OK
        facility.refresh_from_db()
        assert facility.name == "New"

    def test_delete(self):
        facility = FacilityFactory()
        url = reverse("directory:facility-detail", args=[facility.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_bulk_delete(self):
        f1 = FacilityFactory()
        f2 = FacilityFactory()
        url = reverse("directory:facility-bulk-delete")
        response = self.client.delete(url, {"ids": [f1.pk, f2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2

    def test_search(self):
        FacilityFactory(name="РП-10")
        FacilityFactory(name="ТП-5")
        url = reverse("directory:facility-list")
        response = self.client.get(url, {"search": "РП"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_by_org_unit(self):
        org = OrgUnitFactory()
        FacilityFactory(org_unit=org)
        FacilityFactory(org_unit=OrgUnitFactory())
        url = reverse("directory:facility-list")
        response = self.client.get(url, {"org_unit": org.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_by_is_active(self):
        FacilityFactory(is_active=True)
        FacilityFactory(is_active=False)
        url = reverse("directory:facility-list")
        response = self.client.get(url, {"is_active": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_org_unit_name_in_response(self):
        org = OrgUnitFactory(name="ООО Нефтехим")
        facility = FacilityFactory(org_unit=org)
        url = reverse("directory:facility-detail", args=[facility.pk])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["org_unit_name"] == "ООО Нефтехим"

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("directory:facility-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
