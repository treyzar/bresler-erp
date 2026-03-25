import django_filters

from apps.devices.models import (
    DeviceComponent,
    DeviceRZA,
    ModRZA,
    Parameter,
    Product,
    ProductCategory,
)


class DeviceRZAFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = DeviceRZA
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            django_filters.rest_framework.filters.Q(rza_name__icontains=value)
            | django_filters.rest_framework.filters.Q(rza_code__icontains=value)
            | django_filters.rest_framework.filters.Q(rza_short_name__icontains=value)
        )


class ModRZAFilter(django_filters.FilterSet):
    device_rza = django_filters.NumberFilter(field_name="device_rza_id")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = ModRZA
        fields = ["device_rza"]

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(mod_name__icontains=value)
            | Q(mod_code__icontains=value)
            | Q(alter_mod_code__icontains=value)
        )


class ParameterFilter(django_filters.FilterSet):
    is_leaf = django_filters.BooleanFilter(field_name="_is_leaf")
    parameter_type = django_filters.CharFilter()
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Parameter
        fields = ["parameter_type"]


class DeviceComponentFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    component_type = django_filters.NumberFilter(field_name="component_type_id")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = DeviceComponent
        fields = ["is_active", "component_type"]

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(component_name__icontains=value)
            | Q(component_type__name__icontains=value)
        )


class ProductFilter(django_filters.FilterSet):
    product_type = django_filters.NumberFilter(field_name="product_type_id")
    is_active = django_filters.BooleanFilter()
    is_spare_part = django_filters.BooleanFilter()
    search = django_filters.CharFilter(method="filter_search")
    category = django_filters.NumberFilter(method="filter_category")

    class Meta:
        model = Product
        fields = ["product_type", "is_active", "is_spare_part"]

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(name__icontains=value) | Q(internal_code__icontains=value)
        )

    def filter_category(self, queryset, name, value):
        return queryset.filter(catalog_placements__category_id=value)


class ProductCategoryFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = ProductCategory
        fields = ["is_active"]
