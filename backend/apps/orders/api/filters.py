from django.db.models import Q
from django_filters import rest_framework as filters

from apps.orders.models import Order


class OrderFilter(filters.FilterSet):
    status = filters.CharFilter(lookup_expr="exact")
    customer = filters.NumberFilter(field_name="customer_org_unit_id")
    country = filters.NumberFilter(field_name="country_id")
    start_date_from = filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date_to = filters.DateFilter(field_name="start_date", lookup_expr="lte")
    ship_date_from = filters.DateFilter(field_name="ship_date", lookup_expr="gte")
    ship_date_to = filters.DateFilter(field_name="ship_date", lookup_expr="lte")
    tender_number = filters.CharFilter(lookup_expr="icontains")
    branch = filters.NumberFilter(method="filter_org_unit_by_type")
    division = filters.NumberFilter(method="filter_org_unit_by_type")
    facility = filters.NumberFilter(method="filter_org_unit_by_type")
    equipment = filters.NumberFilter(field_name="equipments", lookup_expr="exact")
    work = filters.NumberFilter(field_name="works", lookup_expr="exact")
    participant = filters.NumberFilter(field_name="participants", lookup_expr="exact")

    class Meta:
        model = Order
        fields = [
            "status", "customer", "country",
            "tender_number", "branch", "division", "facility",
            "equipment", "work", "participant",
        ]

    def filter_org_unit_by_type(self, queryset, name, value):
        type_map = {"branch": "branch", "division": "division", "facility": "site"}
        unit_type = type_map.get(name)
        return queryset.filter(
            Q(org_units__id=value) & Q(org_units__unit_type=unit_type)
        )
