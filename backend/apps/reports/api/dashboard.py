"""Dashboard API — aggregated data for the main dashboard."""

from datetime import date, timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Contract, Order


class DashboardView(APIView):
    """GET /api/dashboard/ — aggregated data for dashboard widgets."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        active_statuses = ["N", "D", "P", "C"]
        status_labels = dict(Order.Status.choices)

        # Number cards
        total_orders = Order.objects.count()
        in_progress = Order.objects.filter(status__in=["D", "P", "C"]).count()
        overdue = Order.objects.filter(ship_date__lt=today, status__in=active_statuses, ship_date__isnull=False).count()
        total_amount = Contract.objects.aggregate(total=Sum("amount"))["total"] or 0

        # Orders by status (pie chart)
        orders_by_status = [
            {
                "status": row["status"],
                "label": status_labels.get(row["status"], row["status"]),
                "count": row["count"],
            }
            for row in (Order.objects.values("status").annotate(count=Count("id")).order_by("-count"))
        ]

        # Orders timeline — last 12 months (line chart)
        twelve_months_ago = today - timedelta(days=365)
        months_ru = [
            "",
            "Янв",
            "Фев",
            "Мар",
            "Апр",
            "Май",
            "Июн",
            "Июл",
            "Авг",
            "Сен",
            "Окт",
            "Ноя",
            "Дек",
        ]
        orders_timeline = [
            {
                "month": f"{months_ru[row['month_dt'].month]} {row['month_dt'].year}",
                "count": row["count"],
            }
            for row in (
                Order.objects.filter(created_at__date__gte=twelve_months_ago)
                .annotate(month_dt=TruncMonth("created_at"))
                .values("month_dt")
                .annotate(count=Count("id"))
                .order_by("month_dt")
            )
        ]

        # My orders (current user as manager)
        my_orders = [
            {
                "order_number": o.order_number,
                "status": o.status,
                "status_label": status_labels.get(o.status, o.status),
                "customer": o.customer_org_unit.name if o.customer_org_unit else "—",
                "ship_date": o.ship_date.strftime("%d.%m.%Y") if o.ship_date else None,
            }
            for o in (
                Order.objects.filter(managers=request.user, status__in=active_statuses)
                .select_related("customer_org_unit")
                .order_by("ship_date")[:10]
            )
        ]

        return Response(
            {
                "total_orders": total_orders,
                "in_progress": in_progress,
                "overdue": overdue,
                "total_contract_amount": float(total_amount),
                "orders_by_status": orders_by_status,
                "orders_timeline": orders_timeline,
                "my_orders": my_orders,
            }
        )
