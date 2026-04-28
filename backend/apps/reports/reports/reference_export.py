"""Reference export report — shipped orders grouped by equipment."""

from apps.orders.models import Order
from apps.reports.base import BaseReport, ColumnDef, FilterDef
from apps.reports.registry import register


@register
class ReferenceExportReport(BaseReport):
    name = "reference_export"
    title = "Выгрузка референса"
    description = "Отгруженные заказы с группировкой по оборудованию (статусы «Отгружен» и «Архив»)"
    filters = [
        FilterDef("ship_date_from", "Отгрузка с", type="date"),
        FilterDef("ship_date_to", "Отгрузка по", type="date"),
        FilterDef("customer", "Заказчик", type="text"),
        FilterDef("equipment", "Оборудование", type="text"),
    ]
    columns = [
        ColumnDef("equipment", "Оборудование"),
        ColumnDef("order_number", "№ заказа", type="number"),
        ColumnDef("customer", "Заказчик"),
        ColumnDef("country", "Страна"),
        ColumnDef("facility", "Объект"),
        ColumnDef("ship_date", "Дата отгрузки", type="date"),
        ColumnDef("contract_amount", "Сумма контракта", type="currency"),
    ]

    def get_data(self, filters: dict) -> list[dict]:
        # S = Отгружен, A = Архив (прошли через отгрузку)
        qs = (
            Order.objects.filter(status__in=["S", "A"])
            .select_related(
                "customer_org_unit",
                "country",
                "contract",
            )
            .prefetch_related("equipments", "facilities")
        )

        if filters.get("ship_date_from"):
            qs = qs.filter(ship_date__gte=filters["ship_date_from"])
        if filters.get("ship_date_to"):
            qs = qs.filter(ship_date__lte=filters["ship_date_to"])
        if filters.get("customer"):
            qs = qs.filter(customer_org_unit__name=filters["customer"])
        if filters.get("equipment"):
            qs = qs.filter(equipments__name=filters["equipment"])

        qs = qs.distinct().order_by("ship_date")

        equipment_filter = filters.get("equipment", "")

        rows = []
        for order in qs:
            equipments = list(order.equipments.all())
            facilities = ", ".join(f.name for f in order.facilities.all())

            try:
                amount = float(order.contract.amount) if order.contract.amount else 0
            except Order.contract.RelatedObjectDoesNotExist:
                amount = 0

            base = {
                "order_number": order.order_number,
                "customer": order.customer_org_unit.name if order.customer_org_unit else "—",
                "country": order.country.name if order.country else "—",
                "facility": facilities or "—",
                "ship_date": order.ship_date.isoformat() if order.ship_date else "",
                "contract_amount": amount,
            }

            if not equipments:
                if not equipment_filter:
                    rows.append({**base, "equipment": "—"})
            else:
                for eq in equipments:
                    if equipment_filter and eq.name != equipment_filter:
                        continue
                    rows.append({**base, "equipment": eq.name})

        rows.sort(key=lambda r: (r["equipment"], r["ship_date"]))
        return rows
