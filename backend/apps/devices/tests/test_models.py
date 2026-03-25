import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.devices.models import (
    CatalogPlacement,
    DeviceRZA,
    ModRZA,
    Parameter,
    ParameterValue,
    Product,
    ProductAttribute,
    ProductAttributeOption,
    ProductAttributeValue,
    ProductBOMLine,
    ProductCategory,
    RZASpec,
    VoltageClass,
)
from apps.devices.tests.factories import (
    CatalogPlacementFactory,
    ComponentTypeFactory,
    DeviceComponentFactory,
    DeviceRZAComponentFactory,
    DeviceRZAFactory,
    DeviceRZAParameterFactory,
    ModRZAComponentFactory,
    ModRZAFactory,
    ModRZAParameterFactory,
    ParameterFactory,
    ParameterValueFactory,
    ProductAttributeFactory,
    ProductAttributeOptionFactory,
    ProductBOMLineFactory,
    ProductCategoryFactory,
    ProductFactory,
    ProductTypeFactory,
    RZASpecFactory,
    TypicalSchemeFactory,
    VoltageClassFactory,
)

pytestmark = pytest.mark.django_db


# ── RZA Models ───────────────────────────────────────────────────────


class TestVoltageClass:
    def test_create(self):
        vc = VoltageClassFactory()
        assert vc.pk is not None
        assert str(vc) == vc.name

    def test_timestamps(self):
        vc = VoltageClassFactory()
        assert vc.created_at is not None
        assert vc.updated_at is not None


class TestDeviceRZA:
    def test_create(self):
        device = DeviceRZAFactory(rza_name="Защита линии", rza_code="0107")
        assert device.pk is not None
        assert "0107" in str(device)

    def test_unique_rza_code(self):
        DeviceRZAFactory(rza_code="0001")
        with pytest.raises(IntegrityError):
            DeviceRZAFactory(rza_code="0001")

    def test_str_representation(self):
        device = DeviceRZAFactory(rza_code="0107", rza_name="Защита линии")
        assert str(device) == "0107 — Защита линии"


class TestModRZA:
    def test_create(self):
        mod = ModRZAFactory()
        assert mod.pk is not None

    def test_full_code(self):
        device = DeviceRZAFactory(rza_code="0107")
        mod = ModRZAFactory(device_rza=device, mod_code="001")
        assert mod.full_code == "Бреслер-0107.0107.001"

    def test_unique_constraint(self):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device, mod_code="001")
        with pytest.raises(IntegrityError):
            ModRZAFactory(device_rza=device, mod_code="001")

    def test_cascade_delete(self):
        device = DeviceRZAFactory()
        ModRZAFactory(device_rza=device)
        ModRZAFactory(device_rza=device)
        device_pk = device.pk
        assert ModRZA.objects.filter(device_rza_id=device_pk).count() == 2
        device.delete()
        assert ModRZA.objects.filter(device_rza_id=device_pk).count() == 0


# ── Parameter Models ─────────────────────────────────────────────────


class TestParameter:
    def test_create_root(self):
        param = ParameterFactory(name="Напряжение питания")
        assert param.pk is not None
        assert param.depth == 1

    def test_create_child(self):
        root = Parameter.add_root(name="Общие", parameter_type="select")
        child = root.add_child(name="Напряжение", parameter_type="select")
        assert child.depth == 2
        root.refresh_from_db()
        assert root._is_leaf is False

    def test_tree_structure(self):
        root = Parameter.add_root(name="Root", parameter_type="select")
        root.add_child(name="Child 1", parameter_type="select")
        root.add_child(name="Child 2", parameter_type="select")
        root.refresh_from_db()
        assert root.get_children_count() == 2

    def test_str(self):
        param = ParameterFactory(name="Тестовый")
        assert str(param) == "Тестовый"


class TestParameterValue:
    def test_create(self):
        pv = ParameterValueFactory(value="~220 В")
        assert str(pv) == f"{pv.parameter.name}: ~220 В"

    def test_multiple_values_per_parameter(self):
        param = ParameterFactory()
        ParameterValueFactory(parameter=param, value="~220 В")
        ParameterValueFactory(parameter=param, value="~110 В")
        assert param.values.count() == 2


# ── Component Models ─────────────────────────────────────────────────


class TestDeviceComponent:
    def test_create(self):
        comp = DeviceComponentFactory(component_name="Блок БТ-01")
        assert comp.pk is not None
        assert comp.is_active is True

    def test_str(self):
        comp = DeviceComponentFactory()
        assert comp.component_type.name in str(comp)

    def test_produx_id_index(self):
        comp = DeviceComponentFactory(produx_id=12345)
        from apps.devices.models import DeviceComponent
        found = DeviceComponent.objects.filter(produx_id=12345).first()
        assert found == comp


# ── Junction Models ──────────────────────────────────────────────────


class TestJunctions:
    def test_device_parameter(self):
        dp = DeviceRZAParameterFactory(price=Decimal("1500.00"))
        assert dp.pk is not None
        assert dp.price == Decimal("1500.00")

    def test_device_parameter_unique(self):
        dp = DeviceRZAParameterFactory()
        with pytest.raises(IntegrityError):
            DeviceRZAParameterFactory(
                device_rza=dp.device_rza, parameter=dp.parameter
            )

    def test_mod_parameter(self):
        mp = ModRZAParameterFactory()
        assert mp.pk is not None

    def test_device_component(self):
        dc = DeviceRZAComponentFactory()
        assert dc.pk is not None

    def test_mod_component(self):
        mc = ModRZAComponentFactory()
        assert mc.pk is not None

    def test_cascade_on_device_delete(self):
        dp = DeviceRZAParameterFactory()
        device = dp.device_rza
        device.delete()
        from apps.devices.models import DeviceRZAParameter
        assert DeviceRZAParameter.objects.filter(pk=dp.pk).count() == 0


# ── Catalog Models ───────────────────────────────────────────────────


class TestProductCategory:
    def test_create_root(self):
        cat = ProductCategoryFactory(name="РЗА 6-35 кВ")
        assert cat.pk is not None
        assert cat.slug  # auto-generated

    def test_auto_slug(self):
        cat = ProductCategoryFactory(name="Тестовая категория")
        assert cat.slug  # should be transliterated

    def test_tree(self):
        root = ProductCategory.add_root(name="Root")
        child = root.add_child(name="Child")
        assert child.depth == 2
        assert child.get_full_path() == "Root → Child"

    def test_level_name(self):
        root = ProductCategoryFactory(name="Root")
        assert root.level_name == "Категория"


class TestProduct:
    def test_create(self):
        product = ProductFactory()
        assert product.pk is not None
        assert product.slug

    def test_unique_internal_code(self):
        ProductFactory(internal_code="ART-00001")
        with pytest.raises(IntegrityError):
            ProductFactory(internal_code="ART-00001")

    def test_str(self):
        p = ProductFactory(name="Терминал БРЕСЛЕР", internal_code="T-001")
        assert "T-001" in str(p)

    def test_defaults(self):
        p = ProductFactory()
        assert p.currency == "RUB"
        assert p.vat_rate == Decimal("20.00")
        assert p.price_with_vat is True
        assert p.uom == "шт"


class TestRZASpec:
    def test_create(self):
        spec = RZASpecFactory()
        assert spec.pk is not None

    def test_validation_mod_belongs_to_device(self):
        device1 = DeviceRZAFactory()
        device2 = DeviceRZAFactory()
        mod = ModRZAFactory(device_rza=device2)
        spec = RZASpec(product=ProductFactory(), device_rza=device1, mod_rza=mod)
        with pytest.raises(ValidationError):
            spec.clean()

    def test_one_to_one(self):
        product = ProductFactory()
        RZASpecFactory(product=product)
        with pytest.raises(IntegrityError):
            RZASpecFactory(product=product)


class TestCatalogPlacement:
    def test_create(self):
        cp = CatalogPlacementFactory()
        assert cp.pk is not None

    def test_unique_constraint(self):
        cp = CatalogPlacementFactory()
        with pytest.raises(IntegrityError):
            CatalogPlacementFactory(product=cp.product, category=cp.category)


class TestProductBOMLine:
    def test_create(self):
        bom = ProductBOMLineFactory()
        assert bom.pk is not None
        assert bom.quantity == 1

    def test_serial_tracking_default(self):
        child = ProductFactory(track_serial=True)
        bom = ProductBOMLineFactory(child=child, track_serial_override=None)
        assert bom.is_serial_tracked is True

    def test_serial_tracking_override(self):
        child = ProductFactory(track_serial=True)
        bom = ProductBOMLineFactory(child=child, track_serial_override=False)
        assert bom.is_serial_tracked is False


class TestProductAttribute:
    def test_create(self):
        attr = ProductAttributeFactory(code="voltage", name="Напряжение")
        assert attr.pk is not None
        assert "voltage" in str(attr)

    def test_attribute_value_string(self):
        attr = ProductAttributeFactory(value_type="string")
        product = ProductFactory()
        val = ProductAttributeValue.objects.create(
            product=product, attribute=attr, value_string="220V"
        )
        assert val.display_value() == "220V"

    def test_attribute_value_decimal(self):
        attr = ProductAttributeFactory(value_type="decimal")
        product = ProductFactory()
        val = ProductAttributeValue.objects.create(
            product=product, attribute=attr, value_decimal=Decimal("220.5")
        )
        assert val.display_value() == Decimal("220.5")

    def test_attribute_value_choice(self):
        attr = ProductAttributeFactory(value_type="choice")
        opt = ProductAttributeOptionFactory(attribute=attr, code="ac220", label="~220 В")
        product = ProductFactory()
        val = ProductAttributeValue.objects.create(
            product=product, attribute=attr, option=opt
        )
        assert val.display_value() == "~220 В"

    def test_set_value_string(self):
        attr = ProductAttributeFactory(value_type="string")
        product = ProductFactory()
        val = ProductAttributeValue(product=product, attribute=attr)
        val.set_value("test")
        val.save()
        assert val.value_string == "test"

    def test_set_value_choice_by_code(self):
        attr = ProductAttributeFactory(value_type="choice")
        opt = ProductAttributeOptionFactory(attribute=attr, code="opt1", label="Option 1")
        product = ProductFactory()
        val = ProductAttributeValue(product=product, attribute=attr)
        val.set_value("opt1")
        val.save()
        assert val.option == opt


class TestTypicalScheme:
    def test_create(self):
        scheme = TypicalSchemeFactory()
        assert scheme.pk is not None
        assert str(scheme) == scheme.name
