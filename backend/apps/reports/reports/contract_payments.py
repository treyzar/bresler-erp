from django.db.models import Count, Sum

from apps.orders.models import Contract
from apps.reports.base import BaseReport, ChartConfig, ColumnDef, FilterDef
from apps.reports.registry import register

PAYMENT_LABELS = dict(Contract.Status.choices)


@register
class ContractPaymentsReport(BaseReport):
    name = "contract_payments"
    title = "Оплата контрактов"
    description = "Статус оплаты контрактов и суммы"
    filters = [
        FilterDef("date_from", "Период с", type="date"),
        FilterDef("date_to", "Период по", type="date"),
    ]
    columns = [
        ColumnDef("status_label", "Статус оплаты", type="badge"),
        ColumnDef("count", "Контрактов", type="number"),
        ColumnDef("total_amount", "Общая сумма", type="currency"),
    ]
    chart = ChartConfig(chart_type="bar", value_field="total_amount", label_field="status_label", title="Суммы по статусам оплаты")

    def get_data(self, filters: dict) -> list[dict]:
        qs = Contract.objects.all()
        if filters.get("date_from"):
            qs = qs.filter(created_at__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(created_at__date__lte=filters["date_to"])

        data = (
            qs.values("status")
            .annotate(count=Count("id"), total_amount=Sum("amount"))
            .order_by("-total_amount")
        )
        return [
            {
                "status": row["status"],
                "status_label": PAYMENT_LABELS.get(row["status"], row["status"]),
                "count": row["count"],
                "total_amount": float(row["total_amount"] or 0),
            }
            for row in data
        ]
