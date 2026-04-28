import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.directory.tests.factories import FacilityFactory, OrgUnitFactory
from apps.orders.models import Order, OrderFile
from apps.users.tests.factories import UserFactory

from .factories import ContractFactory, OrderFactory, OrderFileFactory


# ---------------------------------------------------------------------------
# OrderViewSet
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list(self):
        OrderFactory()
        OrderFactory()
        url = reverse("orders:order-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_create(self):
        url = reverse("orders:order-list")
        response = self.client.post(url, {"order_number": 100})
        assert response.status_code == status.HTTP_201_CREATED
        assert Order.objects.filter(order_number=100).exists()

    def test_create_with_customer(self):
        org = OrgUnitFactory()
        url = reverse("orders:order-list")
        response = self.client.post(
            url,
            {
                "order_number": 101,
                "customer_org_unit": org.pk,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve(self):
        order = OrderFactory(order_number=50)
        url = reverse("orders:order-detail", args=[order.order_number])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["order_number"] == 50
        assert "contract" in response.data
        assert "order_org_units" in response.data

    def test_update(self):
        order = OrderFactory()
        url = reverse("orders:order-detail", args=[order.order_number])
        response = self.client.patch(url, {"status": "P"})
        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == Order.Status.PRODUCTION

    def test_delete(self):
        order = OrderFactory()
        url = reverse("orders:order-detail", args=[order.order_number])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Order.objects.filter(pk=order.pk).exists()

    def test_next_number(self):
        OrderFactory(order_number=10)
        url = reverse("orders:order-next-number")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["next_number"] == 11

    def test_next_number_empty(self):
        url = reverse("orders:order-next-number")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["next_number"] == 1

    def test_history(self):
        order = OrderFactory()
        url = reverse("orders:order-history", args=[order.order_number])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) >= 1

    def test_filter_by_status(self):
        OrderFactory(status=Order.Status.NEW)
        OrderFactory(status=Order.Status.ASSEMBLED)
        url = reverse("orders:order-list")
        response = self.client.get(url, {"status": "N"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["status"] == "N"

    def test_filter_by_customer(self):
        org = OrgUnitFactory()
        OrderFactory(customer_org_unit=org)
        OrderFactory()
        url = reverse("orders:order-list")
        response = self.client.get(url, {"customer": org.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_search(self):
        OrderFactory(tender_number="TENDER-ABC-123")
        OrderFactory(tender_number="OTHER-999")
        url = reverse("orders:order-list")
        response = self.client.get(url, {"search": "ABC"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_ordering(self):
        OrderFactory(order_number=5)
        OrderFactory(order_number=15)
        url = reverse("orders:order-list")
        response = self.client.get(url, {"ordering": "order_number"})
        assert response.status_code == status.HTTP_200_OK
        numbers = [r["order_number"] for r in response.data["results"]]
        assert numbers == sorted(numbers)

    def test_unauthenticated(self):
        client = APIClient()
        url = reverse("orders:order-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestOrderListOrgUnitDecomposition:
    """
    When an Order's customer points at a deep OrgUnit node, the list
    serializer should decompose the ancestor chain into three columns:
    customer (company), branch, division.
    """

    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def _row_for(self, order):
        url = reverse("orders:order-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        return next(r for r in response.data["results"] if r["id"] == order.id)

    def test_customer_is_deep_division_node(self):
        # Газпром (company) → Газпром переработка Благовещенск (branch) → Амурский ГПЗ (division)
        company = OrgUnitFactory(name="Газпром", unit_type="company")
        branch = OrgUnitFactory(name="Газпром переработка Благовещенск", unit_type="branch", parent=company)
        division = OrgUnitFactory(name="Амурский ГПЗ", unit_type="division", parent=branch)
        order = OrderFactory(customer_org_unit=division)

        row = self._row_for(order)

        assert row["customer_name"] == "Газпром"
        assert row["branch_name"] == "Газпром переработка Благовещенск"
        assert row["division_name"] == "Амурский ГПЗ"

    def test_customer_is_root_company(self):
        company = OrgUnitFactory(name="Газпром", unit_type="company")
        order = OrderFactory(customer_org_unit=company)

        row = self._row_for(order)

        assert row["customer_name"] == "Газпром"
        assert row["branch_name"] == ""
        assert row["division_name"] == ""

    def test_customer_is_branch_under_company(self):
        company = OrgUnitFactory(name="Газпром", unit_type="company")
        branch = OrgUnitFactory(name="Филиал А", unit_type="branch", parent=company)
        order = OrderFactory(customer_org_unit=branch)

        row = self._row_for(order)

        assert row["customer_name"] == "Газпром"
        assert row["branch_name"] == "Филиал А"
        assert row["division_name"] == ""

    def test_customer_is_site_falls_through_full_chain(self):
        company = OrgUnitFactory(name="Холдинг", unit_type="company")
        branch = OrgUnitFactory(name="Филиал", unit_type="branch", parent=company)
        division = OrgUnitFactory(name="Отделение", unit_type="division", parent=branch)
        site = OrgUnitFactory(name="Площадка-1", unit_type="site", parent=division)
        order = OrderFactory(customer_org_unit=site)

        row = self._row_for(order)

        assert row["customer_name"] == "Холдинг"
        assert row["branch_name"] == "Филиал"
        assert row["division_name"] == "Отделение"

    def test_standalone_customer_without_company_ancestor(self):
        # Edge case: selected unit has no company in its chain (weird data).
        # Customer column should still show something (self), other columns empty.
        standalone = OrgUnitFactory(name="Standalone", unit_type="branch")
        order = OrderFactory(customer_org_unit=standalone)

        row = self._row_for(order)

        assert row["customer_name"] == "Standalone"
        assert row["branch_name"] == "Standalone"
        assert row["division_name"] == ""

    def test_no_customer_set(self):
        order = OrderFactory(customer_org_unit=None)

        row = self._row_for(order)

        assert row["customer_name"] == ""
        assert row["branch_name"] == ""
        assert row["division_name"] == ""

    def test_facility_names_come_from_facilities_m2m(self):
        # Regression: previously the list serializer pulled facility_names
        # from obj.org_units (wrong M2M), so the column was always empty.
        f1 = FacilityFactory(name="Площадка №1")
        f2 = FacilityFactory(name="Площадка №2")
        order = OrderFactory()
        order.facilities.add(f1, f2)

        row = self._row_for(order)

        names = set(row["facility_names"].split(", "))
        assert names == {"Площадка №1", "Площадка №2"}

    def test_facility_names_empty_when_no_facilities(self):
        order = OrderFactory()

        row = self._row_for(order)

        assert row["facility_names"] == ""

    def test_customer_path_shows_breadcrumb(self):
        company = OrgUnitFactory(name="Газпром", unit_type="company")
        branch = OrgUnitFactory(name="Филиал", unit_type="branch", parent=company)
        division = OrgUnitFactory(name="Отделение", unit_type="division", parent=branch)
        order = OrderFactory(customer_org_unit=division)

        row = self._row_for(order)

        # Customer column resolves to 'Газпром' (company), which has no ancestors.
        assert row["customer_path"] == "Газпром"
        assert row["branch_path"] == "Газпром › Филиал"
        assert row["division_path"] == "Газпром › Филиал › Отделение"


# ---------------------------------------------------------------------------
# Contract endpoint (via OrderViewSet actions)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderContractAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_get_contract(self):
        contract = ContractFactory(contract_number="K-API-001")
        url = reverse("orders:order-contract", args=[contract.order.order_number])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["contract_number"] == "K-API-001"

    def test_get_contract_not_found(self):
        order = OrderFactory()
        url = reverse("orders:order-contract", args=[order.order_number])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_contract_via_patch(self):
        order = OrderFactory()
        url = reverse("orders:order-contract", args=[order.order_number])
        response = self.client.patch(
            url,
            {
                "contract_number": "K-NEW-001",
                "status": "not_paid",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["contract_number"] == "K-NEW-001"

    def test_update_contract(self):
        contract = ContractFactory()
        url = reverse("orders:order-contract", args=[contract.order.order_number])
        response = self.client.patch(url, {"status": "advance_paid"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "advance_paid"


# ---------------------------------------------------------------------------
# File endpoints (via OrderViewSet actions)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestOrderFilesAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_upload_files(self):
        order = OrderFactory()
        url = reverse("orders:order-upload-files", args=[order.order_number])
        f = SimpleUploadedFile("test.txt", b"test content", content_type="text/plain")
        response = self.client.post(url, {"files": [f]}, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 1
        assert response.data[0]["original_name"] == "test.txt"

    def test_list_files(self):
        order = OrderFactory()
        OrderFileFactory(order=order, original_name="file1.pdf")
        OrderFileFactory(order=order, original_name="file2.pdf")
        url = reverse("orders:order-files", args=[order.order_number])
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_delete_file(self):
        of = OrderFileFactory()
        url = reverse("orders:order-delete-file", args=[of.order.order_number, of.pk])
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not OrderFile.objects.filter(pk=of.pk).exists()
