from django.db.models import Count, Sum

from apps.orders.models import Order
from apps.reports.base import BaseReport, ChartConfig, ColumnDef, FilterDef
from apps.reports.registry import register


@register
class OrdersByCustomerReport(BaseReport):
    name = "orders_by_customer"
    title = "Заказы по заказчикам"
    description = "Топ заказчиков по количеству заказов и сумме контрактов"
    filters = [
        FilterDef("date_from", "Период с", type="date"),
        FilterDef("date_to", "Период по", type="date"),
        FilterDef("limit", "Топ N", type="text", default="20"),
    ]
    columns = [
        ColumnDef("customer", "Заказчик"),
        ColumnDef("count", "Заказов", type="number"),
        ColumnDef("total_amount", "Сумма контрактов", type="currency"),
    ]
    chart = ChartConfig(chart_type="bar", value_field="count", label_field="customer", title="Топ заказчиков")

    def get_data(self, filters: dict) -> list[dict]:
        qs = Order.objects.filter(customer_org_unit__isnull=False)
        if filters.get("date_from"):
            qs = qs.filter(created_at__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(created_at__date__lte=filters["date_to"])

        limit = int(filters.get("limit", 20) or 20)

        data = (
            qs.values("customer_org_unit__name")
            .annotate(count=Count("id"), total_amount=Sum("contract__amount"))
            .order_by("-count")[:limit]
        )
        return [
            {
                "customer": row["customer_org_unit__name"] or "—",
                "count": row["count"],
                "total_amount": float(row["total_amount"] or 0),
            }
            for row in data
        ]
