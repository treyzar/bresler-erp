from rest_framework import serializers

from apps.devices.models import (
    CatalogPlacement,
    ComponentType,
    ComponentVisual,
    CompositeParameterField,
    CompositeParameterTemplate,
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
    ProductAttributeValue,
    ProductBOMLine,
    ProductCategory,
    ProductType,
    RZASpec,
    TerminalLayout,
    TypicalScheme,
    VoltageClass,
)

# ── RZA ──────────────────────────────────────────────────────────────


class VoltageClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoltageClass
        fields = ["id", "name", "description"]


class DeviceRZAListSerializer(serializers.ModelSerializer):
    modifications_count = serializers.IntegerField(read_only=True)
    parameters_count = serializers.IntegerField(read_only=True, default=0)
    components_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DeviceRZA
        fields = [
            "id",
            "rza_name",
            "rza_name_rod",
            "rza_short_name",
            "rza_code",
            "modifications_count",
            "parameters_count",
            "components_count",
            "created_at",
            "updated_at",
        ]


class DeviceRZASerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceRZA
        fields = [
            "id",
            "rza_name",
            "rza_name_rod",
            "rza_short_name",
            "rza_code",
            "created_at",
            "updated_at",
        ]


class ModRZAListSerializer(serializers.ModelSerializer):
    device_rza_name = serializers.CharField(source="device_rza.rza_name", read_only=True)
    full_code = serializers.CharField(read_only=True)
    parameters_count = serializers.IntegerField(read_only=True, default=0)
    components_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ModRZA
        fields = [
            "id",
            "device_rza",
            "device_rza_name",
            "mod_name",
            "mod_code",
            "alter_mod_code",
            "sec_mod_code",
            "full_code",
            "parameters_count",
            "components_count",
            "created_at",
            "updated_at",
        ]


class ModRZASerializer(serializers.ModelSerializer):
    full_code = serializers.CharField(read_only=True)

    class Meta:
        model = ModRZA
        fields = [
            "id",
            "device_rza",
            "mod_name",
            "mod_code",
            "alter_mod_code",
            "sec_mod_code",
            "full_code",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        device_rza = data.get("device_rza") or (self.instance and self.instance.device_rza)
        mod_code = data.get("mod_code") or (self.instance and self.instance.mod_code)
        qs = ModRZA.objects.filter(device_rza=device_rza, mod_code=mod_code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"mod_code": "Код модификации уже существует для этого устройства."})
        return data


# ── Parameters ───────────────────────────────────────────────────────


class ParameterValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParameterValue
        fields = ["id", "parameter", "value", "is_custom_value"]


class ParameterSerializer(serializers.ModelSerializer):
    values = ParameterValueSerializer(many=True, read_only=True)
    children_count = serializers.SerializerMethodField()
    is_leaf = serializers.BooleanField(source="_is_leaf", read_only=True)

    class Meta:
        model = Parameter
        fields = [
            "id",
            "name",
            "parameter_type",
            "is_leaf",
            "can_add_multiple",
            "comment",
            "created_at",
            "values",
            "children_count",
        ]

    def get_children_count(self, obj):
        return obj.get_children_count()


class ParameterTreeSerializer(serializers.ModelSerializer):
    """Compact serializer for tree display."""

    is_leaf = serializers.BooleanField(source="_is_leaf", read_only=True)

    class Meta:
        model = Parameter
        fields = ["id", "name", "parameter_type", "is_leaf", "depth"]


class CompositeParameterTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompositeParameterTemplate
        fields = ["id", "parameter", "name"]


class CompositeParameterFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompositeParameterField
        fields = [
            "id",
            "composite_parameter",
            "name",
            "field_type",
            "order",
            "select_parameter",
        ]


# ── Components ───────────────────────────────────────────────────────


class ComponentTypeSerializer(serializers.ModelSerializer):
    components_count = serializers.SerializerMethodField()

    class Meta:
        model = ComponentType
        fields = ["id", "name", "components_count"]

    def get_components_count(self, obj):
        return obj.components.filter(is_active=True).count()


class DeviceComponentSerializer(serializers.ModelSerializer):
    component_type_name = serializers.CharField(source="component_type.name", read_only=True)

    class Meta:
        model = DeviceComponent
        fields = [
            "id",
            "produx_id",
            "component_name",
            "component_type",
            "component_type_name",
            "is_active",
            "additional_data",
            "created_at",
            "updated_at",
        ]


class ComponentVisualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComponentVisual
        fields = [
            "id",
            "component",
            "visual_type",
            "is_primary",
            "image_file",
            "name",
            "description",
            "image_width",
            "image_height",
            "created_at",
        ]


class TerminalLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = TerminalLayout
        fields = [
            "id",
            "mod_rza",
            "user",
            "layout_data",
            "is_auto_generated",
            "created_at",
            "updated_at",
        ]


# ── Junctions (Device/Mod ↔ Parameter/Component) ────────────────────


class DeviceRZAParameterSerializer(serializers.ModelSerializer):
    parameter_name = serializers.CharField(source="parameter.name", read_only=True)
    parameter_type = serializers.CharField(source="parameter.parameter_type", read_only=True)

    class Meta:
        model = DeviceRZAParameter
        fields = ["id", "device_rza", "parameter", "parameter_name", "parameter_type", "price"]


class ModRZAParameterSerializer(serializers.ModelSerializer):
    parameter_name = serializers.CharField(source="parameter.name", read_only=True)
    parameter_type = serializers.CharField(source="parameter.parameter_type", read_only=True)

    class Meta:
        model = ModRZAParameter
        fields = ["id", "mod_rza", "parameter", "parameter_name", "parameter_type", "price"]


class DeviceRZAComponentSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source="component.component_name", read_only=True)
    component_type_name = serializers.CharField(source="component.component_type.name", read_only=True)

    class Meta:
        model = DeviceRZAComponent
        fields = [
            "id",
            "device_rza",
            "component",
            "component_name",
            "component_type_name",
            "price",
        ]


class ModRZAComponentSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source="component.component_name", read_only=True)
    component_type_name = serializers.CharField(source="component.component_type.name", read_only=True)

    class Meta:
        model = ModRZAComponent
        fields = [
            "id",
            "mod_rza",
            "component",
            "component_name",
            "component_type_name",
            "price",
        ]


# ── Catalog ──────────────────────────────────────────────────────────


class ProductCategorySerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(read_only=True)
    full_path = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = [
            "id",
            "name",
            "short_name",
            "slug",
            "description",
            "is_active",
            "depth",
            "level_name",
            "full_path",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "depth"]

    def get_full_path(self, obj):
        return obj.get_full_path()


class ProductCategoryTreeSerializer(serializers.ModelSerializer):
    """Compact serializer for tree views."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "short_name", "slug", "is_active", "depth", "children"]

    def get_children(self, obj):
        children = obj.get_children().filter(is_active=True)
        return ProductCategoryTreeSerializer(children, many=True).data


class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ["id", "name", "code", "mark", "description", "is_active"]


class ProductListSerializer(serializers.ModelSerializer):
    product_type_name = serializers.CharField(source="product_type.name", read_only=True, default=None)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "internal_code",
            "slug",
            "product_type",
            "product_type_name",
            "base_price",
            "currency",
            "is_active",
            "is_spare_part",
            "created_at",
        ]


class ProductBOMLineSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.name", read_only=True)
    child_code = serializers.CharField(source="child.internal_code", read_only=True)

    class Meta:
        model = ProductBOMLine
        fields = [
            "id",
            "parent",
            "child",
            "child_name",
            "child_code",
            "role",
            "quantity",
            "slot_label",
            "track_serial_override",
        ]


class RZASpecSerializer(serializers.ModelSerializer):
    device_rza_code = serializers.CharField(source="device_rza.rza_code", read_only=True)
    device_rza_name = serializers.CharField(source="device_rza.rza_name", read_only=True)
    mod_rza_code = serializers.CharField(source="mod_rza.mod_code", read_only=True, default=None)

    class Meta:
        model = RZASpec
        fields = [
            "id",
            "product",
            "device_rza",
            "device_rza_code",
            "device_rza_name",
            "mod_rza",
            "mod_rza_code",
            "description",
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    product_type_name = serializers.CharField(source="product_type.name", read_only=True, default=None)
    rza_spec = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    bom_lines = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "internal_code",
            "slug",
            "product_type",
            "product_type_name",
            "uom",
            "base_price",
            "currency",
            "vat_rate",
            "price_with_vat",
            "track_serial",
            "is_active",
            "is_spare_part",
            "valid_from",
            "valid_to",
            "created_at",
            "updated_at",
            "rza_spec",
            "categories",
            "bom_lines",
        ]

    def get_rza_spec(self, obj):
        try:
            spec = obj.rza_spec
            return RZASpecSerializer(spec).data
        except RZASpec.DoesNotExist:
            return None

    def get_categories(self, obj):
        placements = obj.catalog_placements.select_related("category")
        return [
            {"id": p.category.id, "name": p.category.name, "full_path": p.category.get_full_path()} for p in placements
        ]

    def get_bom_lines(self, obj):
        return ProductBOMLineSerializer(obj.bom_lines.select_related("child"), many=True).data


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "internal_code",
            "slug",
            "product_type",
            "uom",
            "base_price",
            "currency",
            "vat_rate",
            "price_with_vat",
            "track_serial",
            "is_active",
            "is_spare_part",
            "valid_from",
            "valid_to",
        ]
        read_only_fields = ["slug"]


class CatalogPlacementSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = CatalogPlacement
        fields = ["id", "product", "category", "category_name"]


class ProductAttributeSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttribute
        fields = ["id", "code", "name", "unit", "value_type", "options"]

    def get_options(self, obj):
        if obj.value_type in ("choice", "multi_choice"):
            return ProductAttributeOptionSerializer(obj.options.all(), many=True).data
        return []


class ProductAttributeOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttributeOption
        fields = ["id", "attribute", "code", "label", "sort_order"]


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_code = serializers.CharField(source="attribute.code", read_only=True)
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttributeValue
        fields = [
            "id",
            "product",
            "attribute",
            "attribute_name",
            "attribute_code",
            "option",
            "value_string",
            "value_decimal",
            "value_bool",
            "display_value",
        ]

    def get_display_value(self, obj):
        return obj.display_value()


class TypicalSchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypicalScheme
        fields = ["id", "name", "image", "description"]
