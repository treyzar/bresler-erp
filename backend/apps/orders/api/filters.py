from django_filters import rest_framework as filters

from apps.orders.models import Order


class OrderFilter(filters.FilterSet):
    status = filters.CharFilter(lookup_expr="exact")
    customer = filters.NumberFilter(field_name="customer_org_unit_id")
    start_date_from = filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date_to = filters.DateFilter(field_name="start_date", lookup_expr="lte")
    ship_date_from = filters.DateFilter(field_name="ship_date", lookup_expr="gte")
    ship_date_to = filters.DateFilter(field_name="ship_date", lookup_expr="lte")

    class Meta:
        model = Order
        fields = ["status", "customer", "country"]
