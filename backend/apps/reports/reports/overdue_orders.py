from datetime import date

from django.db.models import F, Value
from django.db.models.functions import Coalesce

from apps.orders.models import Order
from apps.reports.base import BaseReport, ColumnDef, FilterDef
from apps.reports.registry import register


@register
class OverdueOrdersReport(BaseReport):
    name = "overdue_orders"
    title = "Просроченные заказы"
    description = "Заказы с просроченной датой отгрузки"
    filters = [
        FilterDef("as_of_date", "На дату", type="date", default="today"),
    ]
    columns = [
        ColumnDef("order_number", "№ заказа", type="number"),
        ColumnDef("customer", "Заказчик"),
        ColumnDef("manager", "Менеджер"),
        ColumnDef("ship_date", "Дата отгрузки", type="date"),
        ColumnDef("days_overdue", "Дней просрочки", type="number"),
        ColumnDef("status_label", "Статус", type="badge"),
    ]
    chart = None  # Table-only report

    def get_data(self, filters: dict) -> list[dict]:
        as_of = filters.get("as_of_date") or str(date.today())
        active_statuses = ["N", "D", "P", "C"]

        qs = (
            Order.objects.filter(
                status__in=active_statuses,
                ship_date__lt=as_of,
                ship_date__isnull=False,
            )
            .select_related("customer_org_unit")
            .prefetch_related("managers")
            .order_by("ship_date")
        )

        status_labels = dict(Order.Status.choices)
        today = date.fromisoformat(str(as_of))

        return [
            {
                "order_number": order.order_number,
                "customer": order.customer_org_unit.name if order.customer_org_unit else "—",
                "manager": ", ".join(
                    m.get_full_name() or m.username for m in order.managers.all()
                ) or "—",
                "ship_date": order.ship_date.strftime("%d.%m.%Y"),
                "days_overdue": (today - order.ship_date).days,
                "status_label": status_labels.get(order.status, order.status),
            }
            for order in qs
        ]
