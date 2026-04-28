import pytest
from django.urls import reverse
from rest_framework import status

from apps.devices.models import (
    DeviceRZA,
    DeviceRZAComponent,
    DeviceRZAParameter,
    Product,
    ProductCategory,
)
from apps.devices.tests.factories import (
    DeviceComponentFactory,
    DeviceRZAFactory,
    ModRZAFactory,
    ParameterFactory,
    ProductCategoryFactory,
    ProductFactory,
    ProductTypeFactory,
    RZASpecFactory,
)

pytestmark = pytest.mark.django_db


# ── DeviceRZA API ────────────────────────────────────────────────────


class TestDeviceRZAAPI:
    def test_list(self, authenticated_client):
        DeviceRZAFactory.create_batch(3)
        url = reverse("device-rza-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self, authenticated_client):
        url = reverse("device-rza-list")
        data = {"rza_name": "Защита линии", "rza_code": "0107"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert DeviceRZA.objects.count() == 1

    def test_retrieve(self, authenticated_client):
        device = DeviceRZAFactory()
        url = reverse("device-rza-detail", args=[device.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["rza_code"] == device.rza_code

    def test_update(self, authenticated_client):
        device = DeviceRZAFactory()
        url = reverse("device-rza-detail", args=[device.pk])
        response = authenticated_client.patch(url, {"rza_name": "Новое имя"})
        assert response.status_code == status.HTTP_200_OK
        device.refresh_from_db()
        assert device.rza_name == "Новое имя"

    def test_delete(self, authenticated_client):
        device = DeviceRZAFactory()
        url = reverse("device-rza-detail", args=[device.pk])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_list_unauthenticated(self, api_client):
        url = reverse("device-rza-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_modifications_endpoint(self, authenticated_client):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device)
        ModRZAFactory(device_rza=device)
        url = reverse("device-rza-modifications", args=[device.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_parameters_endpoint(self, authenticated_client):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        DeviceRZAParameter.objects.create(device_rza=device, parameter=param, price=100)
        url = reverse("device-rza-parameters", args=[device.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_add_parameter(self, authenticated_client):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        url = reverse("device-rza-add-parameter", args=[device.pk])
        response = authenticated_client.post(url, {"parameter_id": param.pk, "price": 100})
        assert response.status_code == status.HTTP_201_CREATED

    def test_remove_parameter(self, authenticated_client):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        DeviceRZAParameter.objects.create(device_rza=device, parameter=param)
        url = reverse("device-rza-remove-parameter", args=[device.pk, param.pk])
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_components_endpoint(self, authenticated_client):
        device = DeviceRZAFactory()
        comp = DeviceComponentFactory()
        DeviceRZAComponent.objects.create(device_rza=device, component=comp, price=500)
        url = reverse("device-rza-components", args=[device.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_add_component(self, authenticated_client):
        device = DeviceRZAFactory()
        comp = DeviceComponentFactory()
        url = reverse("device-rza-add-component", args=[device.pk])
        response = authenticated_client.post(url, {"component_id": comp.pk, "price": 500})
        assert response.status_code == status.HTTP_201_CREATED


# ── ModRZA API ───────────────────────────────────────────────────────


class TestModRZAAPI:
    def test_list(self, authenticated_client):
        ModRZAFactory.create_batch(3)
        url = reverse("mod-rza-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self, authenticated_client):
        device = DeviceRZAFactory()
        url = reverse("mod-rza-list")
        data = {"device_rza": device.pk, "mod_code": "001", "mod_name": "Базовая"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_full_code_in_response(self, authenticated_client):
        device = DeviceRZAFactory(rza_code="0107")
        mod = ModRZAFactory(device_rza=device, mod_code="001")
        url = reverse("mod-rza-detail", args=[mod.pk])
        response = authenticated_client.get(url)
        assert response.data["full_code"] == "Бреслер-0107.0107.001"

    def test_filter_by_device(self, authenticated_client):
        d1 = DeviceRZAFactory()
        d2 = DeviceRZAFactory()
        ModRZAFactory(device_rza=d1)
        ModRZAFactory(device_rza=d2)
        url = reverse("mod-rza-list")
        response = authenticated_client.get(url, {"device_rza": d1.pk})
        assert response.data["count"] == 1

    def test_duplicate_mod_code_rejected(self, authenticated_client):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device, mod_code="001")
        url = reverse("mod-rza-list")
        data = {"device_rza": device.pk, "mod_code": "001", "mod_name": "Дубль"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ── Parameter API ────────────────────────────────────────────────────


class TestParameterAPI:
    def test_list(self, authenticated_client):
        ParameterFactory.create_batch(3)
        url = reverse("parameter-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_tree_endpoint(self, authenticated_client):
        from apps.devices.models import Parameter

        root = Parameter.add_root(name="Root", parameter_type="select")
        root.add_child(name="Child", parameter_type="select")
        url = reverse("parameter-tree")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1  # only root
        assert response.data[0]["children_count"] == 1

    def test_children_endpoint(self, authenticated_client):
        from apps.devices.models import Parameter

        root = Parameter.add_root(name="Root", parameter_type="select")
        root.add_child(name="C1", parameter_type="select")
        root.add_child(name="C2", parameter_type="select")
        url = reverse("parameter-children", args=[root.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_add_root(self, authenticated_client):
        url = reverse("parameter-add-root")
        response = authenticated_client.post(url, {"name": "Новый корень", "parameter_type": "select"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_add_child(self, authenticated_client):
        from apps.devices.models import Parameter

        root = Parameter.add_root(name="Root", parameter_type="select")
        url = reverse("parameter-add-child", args=[root.pk])
        response = authenticated_client.post(url, {"name": "Дочерний", "parameter_type": "select"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_filter_by_type(self, authenticated_client):
        ParameterFactory(parameter_type="select")
        ParameterFactory(parameter_type="custom")
        url = reverse("parameter-list")
        response = authenticated_client.get(url, {"parameter_type": "select"})
        # Only the select parameter, not both
        assert response.data["count"] == 1

    def test_filter_by_leaf(self, authenticated_client):
        ParameterFactory(_is_leaf=True)
        ParameterFactory(_is_leaf=False)
        url = reverse("parameter-list")
        response = authenticated_client.get(url, {"is_leaf": True})
        assert response.data["count"] == 1


# ── DeviceComponent API ──────────────────────────────────────────────


class TestDeviceComponentAPI:
    def test_list(self, authenticated_client):
        DeviceComponentFactory.create_batch(3)
        url = reverse("device-component-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_active(self, authenticated_client):
        DeviceComponentFactory(is_active=True)
        DeviceComponentFactory(is_active=False)
        url = reverse("device-component-list")
        response = authenticated_client.get(url, {"is_active": True})
        assert response.data["count"] == 1

    def test_search(self, authenticated_client):
        DeviceComponentFactory(component_name="Блок БТ-01")
        DeviceComponentFactory(component_name="Модуль МП-02")
        url = reverse("device-component-list")
        response = authenticated_client.get(url, {"search": "Блок"})
        assert response.data["count"] == 1


# ── Product Category API ─────────────────────────────────────────────


class TestProductCategoryAPI:
    def test_tree(self, authenticated_client):
        root = ProductCategory.add_root(name="РЗА")
        root.add_child(name="ОМП")
        url = reverse("product-category-tree")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert len(response.data[0]["children"]) == 1

    def test_children(self, authenticated_client):
        root = ProductCategory.add_root(name="Root")
        root.add_child(name="C1")
        root.add_child(name="C2")
        url = reverse("product-category-children", args=[root.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_products_in_category(self, authenticated_client):
        cat = ProductCategoryFactory()
        p1 = ProductFactory()
        p2 = ProductFactory()
        from apps.devices.models import CatalogPlacement

        CatalogPlacement.objects.create(product=p1, category=cat)
        CatalogPlacement.objects.create(product=p2, category=cat)
        url = reverse("product-category-products", args=[cat.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2


# ── Product API ──────────────────────────────────────────────────────


class TestProductAPI:
    def test_list(self, authenticated_client):
        ProductFactory.create_batch(3)
        url = reverse("product-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_create(self, authenticated_client):
        pt = ProductTypeFactory()
        url = reverse("product-list")
        data = {
            "name": "Терминал БРЕСЛЕР-0107",
            "internal_code": "T-0107-001",
            "product_type": pt.pk,
            "base_price": "150000.00",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Product.objects.count() == 1

    def test_retrieve_detail(self, authenticated_client):
        product = ProductFactory()
        RZASpecFactory(product=product)
        url = reverse("product-detail", args=[product.pk])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["rza_spec"] is not None

    def test_search(self, authenticated_client):
        ProductFactory(name="Терминал БРЕСЛЕР", internal_code="T-001")
        ProductFactory(name="Шкаф ШРС", internal_code="SH-001")
        url = reverse("product-list")
        response = authenticated_client.get(url, {"search": "Терминал"})
        assert response.data["count"] == 1

    def test_filter_by_category(self, authenticated_client):
        cat = ProductCategoryFactory()
        p1 = ProductFactory()
        ProductFactory()
        from apps.devices.models import CatalogPlacement

        CatalogPlacement.objects.create(product=p1, category=cat)
        url = reverse("product-list")
        response = authenticated_client.get(url, {"category": cat.pk})
        assert response.data["count"] == 1


# ── VoltageClass API ─────────────────────────────────────────────────


class TestVoltageClassAPI:
    def test_crud(self, authenticated_client):
        url = reverse("voltage-class-list")
        response = authenticated_client.post(url, {"name": "6-35 кВ"})
        assert response.status_code == status.HTTP_201_CREATED
        pk = response.data["id"]

        response = authenticated_client.get(url)
        assert response.data["count"] == 1

        detail_url = reverse("voltage-class-detail", args=[pk])
        response = authenticated_client.patch(detail_url, {"name": "110 кВ"})
        assert response.status_code == status.HTTP_200_OK

        response = authenticated_client.delete(detail_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
