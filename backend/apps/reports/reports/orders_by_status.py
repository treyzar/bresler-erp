from django.db.models import Count, Sum

from apps.orders.models import Order
from apps.reports.base import BaseReport, ChartConfig, ColumnDef, FilterDef
from apps.reports.registry import register

STATUS_LABELS = dict(Order.Status.choices)


@register
class OrdersByStatusReport(BaseReport):
    name = "orders_by_status"
    title = "Заказы по статусам"
    description = "Количество заказов в разрезе статусов"
    filters = [
        FilterDef("date_from", "Период с", type="date"),
        FilterDef("date_to", "Период по", type="date"),
    ]
    columns = [
        ColumnDef("status_label", "Статус", type="badge"),
        ColumnDef("count", "Количество", type="number"),
        ColumnDef("total_amount", "Сумма контрактов", type="currency"),
    ]
    chart = ChartConfig(chart_type="pie", value_field="count", label_field="status_label", title="Заказы по статусам")

    def get_data(self, filters: dict) -> list[dict]:
        qs = Order.objects.all()
        if filters.get("date_from"):
            qs = qs.filter(created_at__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(created_at__date__lte=filters["date_to"])

        data = (
            qs.values("status")
            .annotate(count=Count("id"), total_amount=Sum("contract__amount"))
            .order_by("-count")
        )
        return [
            {
                "status": row["status"],
                "status_label": STATUS_LABELS.get(row["status"], row["status"]),
                "count": row["count"],
                "total_amount": float(row["total_amount"] or 0),
            }
            for row in data
        ]
