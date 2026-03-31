from django.db.models import Count, Sum

from apps.orders.models import Order
from apps.reports.base import BaseReport, ChartConfig, ColumnDef, FilterDef
from apps.reports.registry import register


@register
class OrdersByManagerReport(BaseReport):
    name = "orders_by_manager"
    title = "Заказы по менеджерам"
    description = "Количество заказов и сумма контрактов в разрезе менеджеров"
    filters = [
        FilterDef("date_from", "Период с", type="date"),
        FilterDef("date_to", "Период по", type="date"),
        FilterDef("status", "Статус", type="select", choices=list(Order.Status.choices)),
    ]
    columns = [
        ColumnDef("manager", "Менеджер"),
        ColumnDef("count", "Заказов", type="number"),
        ColumnDef("total_amount", "Сумма контрактов", type="currency"),
    ]
    chart = ChartConfig(chart_type="bar", value_field="count", label_field="manager", title="Заказы по менеджерам")

    def get_data(self, filters: dict) -> list[dict]:
        qs = Order.objects.filter(managers__isnull=False)
        if filters.get("date_from"):
            qs = qs.filter(created_at__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(created_at__date__lte=filters["date_to"])
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])

        data = (
            qs.values("managers__last_name", "managers__first_name")
            .annotate(count=Count("id", distinct=True), total_amount=Sum("contract__amount"))
            .order_by("-count")
        )
        return [
            {
                "manager": f"{row['managers__last_name']} {row['managers__first_name']}".strip() or "—",
                "count": row["count"],
                "total_amount": float(row["total_amount"] or 0),
            }
            for row in data
        ]
