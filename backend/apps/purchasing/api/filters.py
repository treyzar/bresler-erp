import django_filters

from apps.purchasing.models import (
    PurchaseOrder,
    PurchasePayment,
    PurchaseRequest,
    StockItem,
)


class StockItemFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="product__name", lookup_expr="icontains")
    has_stock = django_filters.BooleanFilter(method="filter_has_stock")

    class Meta:
        model = StockItem
        fields = []

    def filter_has_stock(self, queryset, name, value):
        if value:
            return queryset.filter(quantity__gt=0)
        return queryset


class PurchaseRequestFilter(django_filters.FilterSet):
    order = django_filters.NumberFilter(field_name="order__order_number")
    status = django_filters.ChoiceFilter(choices=PurchaseRequest.Status.choices)
    created_by = django_filters.NumberFilter()

    class Meta:
        model = PurchaseRequest
        fields = ["order", "status", "created_by"]


class PurchaseOrderFilter(django_filters.FilterSet):
    supplier = django_filters.NumberFilter()
    order = django_filters.NumberFilter(field_name="order__order_number")
    status = django_filters.ChoiceFilter(choices=PurchaseOrder.Status.choices)
    purchaser = django_filters.NumberFilter()
    date_from = django_filters.DateFilter(field_name="order_date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="order_date", lookup_expr="lte")

    class Meta:
        model = PurchaseOrder
        fields = ["supplier", "order", "status", "purchaser"]


class PurchasePaymentFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=PurchasePayment.Status.choices)
    purchase_order = django_filters.NumberFilter()

    class Meta:
        model = PurchasePayment
        fields = ["status", "purchase_order"]
