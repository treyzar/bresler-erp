from django.contrib import admin
from treebeard.admin import TreeAdmin
from treebeard.forms import movenodeform_factory

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


class ModRZAInline(admin.TabularInline):
    model = ModRZA
    extra = 0
    fields = ["mod_code", "mod_name", "alter_mod_code", "sec_mod_code"]


class DeviceRZAParameterInline(admin.TabularInline):
    model = DeviceRZAParameter
    extra = 0
    autocomplete_fields = ["parameter"]


class DeviceRZAComponentInline(admin.TabularInline):
    model = DeviceRZAComponent
    extra = 0
    autocomplete_fields = ["component"]


@admin.register(VoltageClass)
class VoltageClassAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]
    search_fields = ["name"]


@admin.register(DeviceRZA)
class DeviceRZAAdmin(admin.ModelAdmin):
    list_display = ["rza_code", "rza_name", "rza_short_name", "created_at"]
    search_fields = ["rza_name", "rza_code", "rza_short_name"]
    list_filter = ["created_at"]
    inlines = [ModRZAInline, DeviceRZAParameterInline, DeviceRZAComponentInline]


class ModRZAParameterInline(admin.TabularInline):
    model = ModRZAParameter
    extra = 0
    autocomplete_fields = ["parameter"]


class ModRZAComponentInline(admin.TabularInline):
    model = ModRZAComponent
    extra = 0
    autocomplete_fields = ["component"]


@admin.register(ModRZA)
class ModRZAAdmin(admin.ModelAdmin):
    list_display = ["mod_code", "mod_name", "device_rza", "full_code"]
    search_fields = ["mod_code", "mod_name", "alter_mod_code"]
    list_filter = ["device_rza"]
    autocomplete_fields = ["device_rza"]
    inlines = [ModRZAParameterInline, ModRZAComponentInline]

    def full_code(self, obj):
        return obj.full_code

    full_code.short_description = "Полный код"


# ── Parameters ───────────────────────────────────────────────────────


class ParameterValueInline(admin.TabularInline):
    model = ParameterValue
    extra = 1


class CompositeParameterFieldInline(admin.TabularInline):
    model = CompositeParameterField
    fk_name = "composite_parameter"
    extra = 0


@admin.register(Parameter)
class ParameterAdmin(TreeAdmin):
    form = movenodeform_factory(Parameter)
    list_display = ["name", "parameter_type", "_is_leaf", "can_add_multiple"]
    list_filter = ["parameter_type", "_is_leaf"]
    search_fields = ["name"]
    inlines = [ParameterValueInline, CompositeParameterFieldInline]


@admin.register(CompositeParameterTemplate)
class CompositeParameterTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "parameter"]
    autocomplete_fields = ["parameter"]


# ── Components ───────────────────────────────────────────────────────


class ComponentVisualInline(admin.TabularInline):
    model = ComponentVisual
    extra = 0


@admin.register(ComponentType)
class ComponentTypeAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(DeviceComponent)
class DeviceComponentAdmin(admin.ModelAdmin):
    list_display = ["component_name", "component_type", "produx_id", "is_active"]
    list_filter = ["is_active", "component_type"]
    search_fields = ["component_name", "produx_id"]
    inlines = [ComponentVisualInline]


@admin.register(TerminalLayout)
class TerminalLayoutAdmin(admin.ModelAdmin):
    list_display = ["mod_rza", "user", "is_auto_generated", "updated_at"]
    autocomplete_fields = ["mod_rza"]


# ── Catalog ──────────────────────────────────────────────────────────


@admin.register(ProductCategory)
class ProductCategoryAdmin(TreeAdmin):
    form = movenodeform_factory(ProductCategory)
    list_display = ["name", "short_name", "slug", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "short_name"]


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "mark", "is_active"]
    search_fields = ["name", "code"]


class CatalogPlacementInline(admin.TabularInline):
    model = CatalogPlacement
    extra = 0
    autocomplete_fields = ["category"]


class RZASpecInline(admin.StackedInline):
    model = RZASpec
    extra = 0
    autocomplete_fields = ["device_rza", "mod_rza"]


class ProductBOMLineInline(admin.TabularInline):
    model = ProductBOMLine
    fk_name = "parent"
    extra = 0
    autocomplete_fields = ["child"]


class ProductAttributeValueInline(admin.TabularInline):
    model = ProductAttributeValue
    extra = 0
    autocomplete_fields = ["attribute"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "internal_code",
        "name",
        "product_type",
        "base_price",
        "currency",
        "is_active",
        "is_spare_part",
    ]
    list_filter = ["is_active", "is_spare_part", "currency", "product_type"]
    search_fields = ["name", "internal_code", "slug"]
    autocomplete_fields = ["product_type"]
    readonly_fields = ["slug"]
    inlines = [
        RZASpecInline,
        CatalogPlacementInline,
        ProductBOMLineInline,
        ProductAttributeValueInline,
    ]


class ProductAttributeOptionInline(admin.TabularInline):
    model = ProductAttributeOption
    extra = 1


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "unit", "value_type"]
    list_filter = ["value_type"]
    search_fields = ["code", "name"]
    inlines = [ProductAttributeOptionInline]


@admin.register(TypicalScheme)
class TypicalSchemeAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]
