from django_filters import rest_framework as filters

from apps.directory.models import Contact, Facility, OrgUnit


class OrgUnitFilter(filters.FilterSet):
    unit_type = filters.CharFilter(lookup_expr="exact")
    business_role = filters.CharFilter(lookup_expr="exact")
    country = filters.NumberFilter(field_name="country_id")
    is_active = filters.BooleanFilter()
    search = filters.CharFilter(method="search_filter")

    class Meta:
        model = OrgUnit
        fields = ["unit_type", "business_role", "country", "is_active"]

    def search_filter(self, queryset, name, value):
        return queryset.filter(name__icontains=value)


class ContactFilter(filters.FilterSet):
    org_unit = filters.NumberFilter(field_name="org_units__id")
    search = filters.CharFilter(method="search_filter")

    class Meta:
        model = Contact
        fields = ["org_unit"]

    def search_filter(self, queryset, name, value):
        return queryset.filter(full_name__icontains=value)


class FacilityFilter(filters.FilterSet):
    org_unit = filters.NumberFilter(field_name="org_unit_id")
    is_active = filters.BooleanFilter()

    class Meta:
        model = Facility
        fields = ["org_unit", "is_active"]
