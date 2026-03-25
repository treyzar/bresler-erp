import pytest
from decimal import Decimal

from apps.devices.models import (
    DeviceComponent,
    DeviceRZAComponent,
    DeviceRZAParameter,
    ModRZAComponent,
    ModRZAParameter,
)
from apps.devices.services.component_service import ComponentService
from apps.devices.services.device_service import DeviceService
from apps.devices.tests.factories import (
    ComponentTypeFactory,
    DeviceComponentFactory,
    DeviceRZAFactory,
    ModRZAFactory,
    ParameterFactory,
)

pytestmark = pytest.mark.django_db


# ── DeviceService ────────────────────────────────────────────────────


class TestDeviceServiceSearch:
    def test_get_devices_no_filter(self):
        DeviceRZAFactory.create_batch(3)
        devices = DeviceService.get_devices()
        assert devices.count() == 3

    def test_get_devices_with_search(self):
        DeviceRZAFactory(rza_name="Защита линии", rza_code="0107")
        DeviceRZAFactory(rza_name="ОМП", rza_code="0201")
        devices = DeviceService.get_devices(search="Защита")
        assert devices.count() == 1

    def test_get_devices_annotated(self):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device)
        ModRZAFactory(device_rza=device)
        result = DeviceService.get_devices().get(pk=device.pk)
        assert result.modifications_count == 2

    def test_get_modifications(self):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device, mod_code="001")
        ModRZAFactory(device_rza=device, mod_code="002")
        mods = DeviceService.get_modifications(device.pk)
        assert mods.count() == 2

    def test_get_modifications_with_search(self):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device, mod_name="Базовая", mod_code="001")
        ModRZAFactory(device_rza=device, mod_name="Расширенная", mod_code="002")
        mods = DeviceService.get_modifications(device.pk, search="Базовая")
        assert mods.count() == 1


class TestDeviceServiceParameters:
    def test_add_parameter_to_device(self):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        obj, created = DeviceService.add_parameter_to_device(device.pk, param.pk, 100)
        assert created is True
        assert DeviceRZAParameter.objects.filter(device_rza=device).count() == 1

    def test_add_parameter_idempotent(self):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        DeviceService.add_parameter_to_device(device.pk, param.pk)
        _, created = DeviceService.add_parameter_to_device(device.pk, param.pk)
        assert created is False

    def test_remove_parameter_from_device(self):
        device = DeviceRZAFactory()
        param = ParameterFactory()
        DeviceService.add_parameter_to_device(device.pk, param.pk)
        DeviceService.remove_parameter_from_device(device.pk, param.pk)
        assert DeviceRZAParameter.objects.filter(device_rza=device).count() == 0

    def test_add_parameter_to_modification(self):
        mod = ModRZAFactory()
        param = ParameterFactory()
        obj, created = DeviceService.add_parameter_to_modification(mod.pk, param.pk, 200)
        assert created is True
        assert ModRZAParameter.objects.filter(mod_rza=mod).count() == 1

    def test_remove_parameter_from_modification(self):
        mod = ModRZAFactory()
        param = ParameterFactory()
        DeviceService.add_parameter_to_modification(mod.pk, param.pk)
        DeviceService.remove_parameter_from_modification(mod.pk, param.pk)
        assert ModRZAParameter.objects.filter(mod_rza=mod).count() == 0


class TestDeviceServiceComponents:
    def test_add_component_to_device(self):
        device = DeviceRZAFactory()
        comp = DeviceComponentFactory()
        _, created = DeviceService.add_component_to_device(device.pk, comp.pk, 500)
        assert created is True

    def test_remove_component_from_device(self):
        device = DeviceRZAFactory()
        comp = DeviceComponentFactory()
        DeviceService.add_component_to_device(device.pk, comp.pk)
        DeviceService.remove_component_from_device(device.pk, comp.pk)
        assert DeviceRZAComponent.objects.filter(device_rza=device).count() == 0

    def test_add_component_to_modification(self):
        mod = ModRZAFactory()
        comp = DeviceComponentFactory()
        _, created = DeviceService.add_component_to_modification(mod.pk, comp.pk)
        assert created is True

    def test_remove_component_from_modification(self):
        mod = ModRZAFactory()
        comp = DeviceComponentFactory()
        DeviceService.add_component_to_modification(mod.pk, comp.pk)
        DeviceService.remove_component_from_modification(mod.pk, comp.pk)
        assert ModRZAComponent.objects.filter(mod_rza=mod).count() == 0


class TestDeviceServiceAvailable:
    def test_available_parameters_for_device(self):
        device = DeviceRZAFactory()
        p1 = ParameterFactory()
        p2 = ParameterFactory()
        DeviceService.add_parameter_to_device(device.pk, p1.pk)
        available = DeviceService.get_available_parameters_for_device(device.pk)
        assert p2 in available
        assert p1 not in available

    def test_available_components_for_device(self):
        device = DeviceRZAFactory()
        c1 = DeviceComponentFactory()
        c2 = DeviceComponentFactory()
        DeviceService.add_component_to_device(device.pk, c1.pk)
        available = DeviceService.get_available_components_for_device(device.pk)
        assert c2 in available
        assert c1 not in available

    def test_available_parameters_for_modification(self):
        mod = ModRZAFactory()
        p1 = ParameterFactory()
        p2 = ParameterFactory()
        DeviceService.add_parameter_to_modification(mod.pk, p1.pk)
        available = DeviceService.get_available_parameters_for_modification(mod.pk)
        assert p2 in available
        assert p1 not in available

    def test_available_components_for_modification(self):
        mod = ModRZAFactory()
        c1 = DeviceComponentFactory()
        c2 = DeviceComponentFactory()
        DeviceService.add_component_to_modification(mod.pk, c1.pk)
        available = DeviceService.get_available_components_for_modification(mod.pk)
        assert c2 in available
        assert c1 not in available


# ── ComponentService ─────────────────────────────────────────────────


class TestComponentServiceSync:
    def test_sync_new_component(self):
        comp, created = ComponentService.sync_component(
            produx_id=999,
            component_name="Блок БТ-01",
            component_type_name="Блоки терминалов",
            additional_data={"import_params": {"analogCount": 4}},
        )
        assert created is True
        assert comp.produx_id == 999
        assert comp.is_active is True

    def test_sync_unchanged_component(self):
        ComponentService.sync_component(
            produx_id=100,
            component_name="Блок A",
            component_type_name="Тип 1",
            additional_data={"import_params": {"analogCount": 2}},
        )
        comp, created = ComponentService.sync_component(
            produx_id=100,
            component_name="Блок A",
            component_type_name="Тип 1",
            additional_data={"import_params": {"analogCount": 2}},
        )
        assert created is False
        assert DeviceComponent.objects.filter(produx_id=100).count() == 1

    def test_sync_changed_component_creates_new_version(self):
        ComponentService.sync_component(
            produx_id=200,
            component_name="Блок B",
            component_type_name="Тип 1",
            additional_data={"import_params": {"analogCount": 2}},
        )
        comp, created = ComponentService.sync_component(
            produx_id=200,
            component_name="Блок B v2",
            component_type_name="Тип 1",
            additional_data={"import_params": {"analogCount": 4}},
        )
        assert created is True
        assert comp.component_name == "Блок B v2"
        # Old version deactivated
        all_versions = DeviceComponent.objects.filter(produx_id=200)
        assert all_versions.count() == 2
        assert all_versions.filter(is_active=True).count() == 1
        assert all_versions.filter(is_active=False).count() == 1

    def test_sync_creates_component_type(self):
        ComponentService.sync_component(
            produx_id=300,
            component_name="Блок C",
            component_type_name="Новый тип",
        )
        from apps.devices.models import ComponentType
        assert ComponentType.objects.filter(name="Новый тип").exists()

    def test_get_active_components(self):
        DeviceComponentFactory(is_active=True)
        DeviceComponentFactory(is_active=False)
        result = ComponentService.get_active_components()
        assert result.count() == 1

    def test_get_active_components_search(self):
        DeviceComponentFactory(component_name="Блок А")
        DeviceComponentFactory(component_name="Блок Б")
        result = ComponentService.get_active_components(search="Блок А")
        assert result.count() == 1
