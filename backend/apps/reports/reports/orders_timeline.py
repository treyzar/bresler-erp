from django.db.models import Count
from django.db.models.functions import TruncMonth

from apps.orders.models import Order
from apps.reports.base import BaseReport, ChartConfig, ColumnDef, FilterDef
from apps.reports.registry import register


@register
class OrdersTimelineReport(BaseReport):
    name = "orders_timeline"
    title = "Динамика заказов"
    description = "Количество созданных заказов по месяцам"
    filters = [
        FilterDef("date_from", "Период с", type="date"),
        FilterDef("date_to", "Период по", type="date"),
    ]
    columns = [
        ColumnDef("month", "Месяц"),
        ColumnDef("count", "Создано заказов", type="number"),
    ]
    chart = ChartConfig(chart_type="line", value_field="count", label_field="month", title="Динамика заказов")

    def get_data(self, filters: dict) -> list[dict]:
        qs = Order.objects.all()
        if filters.get("date_from"):
            qs = qs.filter(created_at__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(created_at__date__lte=filters["date_to"])

        data = (
            qs.annotate(month_dt=TruncMonth("created_at"))
            .values("month_dt")
            .annotate(count=Count("id"))
            .order_by("month_dt")
        )

        MONTHS_RU = [
            "",
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь",
        ]

        return [
            {
                "month": f"{MONTHS_RU[row['month_dt'].month]} {row['month_dt'].year}",
                "month_sort": row["month_dt"].strftime("%Y-%m"),
                "count": row["count"],
            }
            for row in data
        ]
