import factory
from factory.django import DjangoModelFactory

from apps.devices.models import (
    CatalogPlacement,
    ComponentType,
    DeviceComponent,
    DeviceRZA,
    DeviceRZAComponent,
    DeviceRZAParameter,
    ModRZA,
    ModRZAComponent,
    ModRZAParameter,
    Parameter,
    ParameterValue,
    Product,
    ProductAttribute,
    ProductAttributeOption,
    ProductBOMLine,
    ProductCategory,
    ProductType,
    RZASpec,
    TypicalScheme,
    VoltageClass,
)


# ── RZA ──────────────────────────────────────────────────────────────


class VoltageClassFactory(DjangoModelFactory):
    class Meta:
        model = VoltageClass

    name = factory.Sequence(lambda n: f"Класс {n} кВ")
    description = factory.Faker("sentence", locale="ru_RU")


class DeviceRZAFactory(DjangoModelFactory):
    class Meta:
        model = DeviceRZA

    rza_name = factory.Sequence(lambda n: f"Устройство РЗА {n}")
    rza_code = factory.Sequence(lambda n: f"{n:04d}")
    rza_short_name = factory.LazyAttribute(lambda o: f"УРЗ-{o.rza_code}")


class ModRZAFactory(DjangoModelFactory):
    class Meta:
        model = ModRZA

    device_rza = factory.SubFactory(DeviceRZAFactory)
    mod_name = factory.Sequence(lambda n: f"Модификация {n}")
    mod_code = factory.Sequence(lambda n: f"{n:03d}")


# ── Parameters ───────────────────────────────────────────────────────


class ParameterFactory(DjangoModelFactory):
    class Meta:
        model = Parameter
        exclude = ["parent"]

    name = factory.Sequence(lambda n: f"Параметр {n}")
    parameter_type = "select"
    _is_leaf = True
    can_add_multiple = False

    parent = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        parent = kwargs.pop("parent", None)
        # Remove ALL treebeard-managed fields
        for field in ("depth", "path", "numchild", "steplen", "alphabet"):
            kwargs.pop(field, None)
        if parent is not None:
            # Refresh parent from db to ensure treebeard state is current
            parent.refresh_from_db()
            return parent.add_child(**kwargs)
        return model_class.add_root(**kwargs)


class ParameterValueFactory(DjangoModelFactory):
    class Meta:
        model = ParameterValue

    parameter = factory.SubFactory(ParameterFactory)
    value = factory.Sequence(lambda n: f"Значение {n}")
    is_custom_value = False


# ── Components ───────────────────────────────────────────────────────


class ComponentTypeFactory(DjangoModelFactory):
    class Meta:
        model = ComponentType

    name = factory.Sequence(lambda n: f"Тип компонента {n}")


class DeviceComponentFactory(DjangoModelFactory):
    class Meta:
        model = DeviceComponent

    produx_id = factory.Sequence(lambda n: n + 1000)
    component_name = factory.Sequence(lambda n: f"Компонент {n}")
    component_type = factory.SubFactory(ComponentTypeFactory)
    is_active = True
    additional_data = None


# ── Junctions ────────────────────────────────────────────────────────


class DeviceRZAParameterFactory(DjangoModelFactory):
    class Meta:
        model = DeviceRZAParameter

    device_rza = factory.SubFactory(DeviceRZAFactory)
    parameter = factory.SubFactory(ParameterFactory)
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)


class ModRZAParameterFactory(DjangoModelFactory):
    class Meta:
        model = ModRZAParameter

    mod_rza = factory.SubFactory(ModRZAFactory)
    parameter = factory.SubFactory(ParameterFactory)
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)


class DeviceRZAComponentFactory(DjangoModelFactory):
    class Meta:
        model = DeviceRZAComponent

    device_rza = factory.SubFactory(DeviceRZAFactory)
    component = factory.SubFactory(DeviceComponentFactory)
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)


class ModRZAComponentFactory(DjangoModelFactory):
    class Meta:
        model = ModRZAComponent

    mod_rza = factory.SubFactory(ModRZAFactory)
    component = factory.SubFactory(DeviceComponentFactory)
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)


# ── Catalog ──────────────────────────────────────────────────────────


class ProductCategoryFactory(DjangoModelFactory):
    class Meta:
        model = ProductCategory
        exclude = ["parent"]

    name = factory.Sequence(lambda n: f"Категория {n}")
    is_active = True

    parent = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        parent = kwargs.pop("parent", None)
        # Remove ALL treebeard-managed fields
        for field in ("depth", "path", "numchild", "steplen", "alphabet"):
            kwargs.pop(field, None)
        if parent is not None:
            parent.refresh_from_db()
            return parent.add_child(**kwargs)
        return model_class.add_root(**kwargs)


class ProductTypeFactory(DjangoModelFactory):
    class Meta:
        model = ProductType

    name = factory.Sequence(lambda n: f"Тип продукта {n}")
    code = factory.Sequence(lambda n: f"PT{n:03d}")
    is_active = True


class ProductFactory(DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Продукт {n}")
    internal_code = factory.Sequence(lambda n: f"ART-{n:05d}")
    product_type = factory.SubFactory(ProductTypeFactory)
    base_price = factory.Faker("pydecimal", left_digits=6, right_digits=2, positive=True)
    is_active = True


class RZASpecFactory(DjangoModelFactory):
    class Meta:
        model = RZASpec

    product = factory.SubFactory(ProductFactory)
    device_rza = factory.SubFactory(DeviceRZAFactory)
    mod_rza = None


class CatalogPlacementFactory(DjangoModelFactory):
    class Meta:
        model = CatalogPlacement

    product = factory.SubFactory(ProductFactory)
    category = factory.SubFactory(ProductCategoryFactory)


class ProductBOMLineFactory(DjangoModelFactory):
    class Meta:
        model = ProductBOMLine

    parent = factory.SubFactory(ProductFactory)
    child = factory.SubFactory(ProductFactory)
    role = "MISC"
    quantity = 1


class ProductAttributeFactory(DjangoModelFactory):
    class Meta:
        model = ProductAttribute

    code = factory.Sequence(lambda n: f"attr_{n}")
    name = factory.Sequence(lambda n: f"Атрибут {n}")
    value_type = "string"


class ProductAttributeOptionFactory(DjangoModelFactory):
    class Meta:
        model = ProductAttributeOption

    attribute = factory.SubFactory(ProductAttributeFactory)
    code = factory.Sequence(lambda n: f"opt_{n}")
    label = factory.Sequence(lambda n: f"Опция {n}")


class TypicalSchemeFactory(DjangoModelFactory):
    class Meta:
        model = TypicalScheme

    name = factory.Sequence(lambda n: f"Типовая схема {n}")
