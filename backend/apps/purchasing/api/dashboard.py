from decimal import Decimal

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import ExtractYear
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine, PurchasePayment


class PurchasingDashboardView(APIView):
    """Dashboard data for the purchasing department head."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get("year")
        po_qs = PurchaseOrder.objects.all()
        if year:
            po_qs = po_qs.filter(order_date__year=year)

        # Summary stats
        total_orders = po_qs.count()
        total_amount = po_qs.aggregate(
            total=Sum("lines__total_price"),
        )["total"] or Decimal("0.00")
        delivered = po_qs.filter(status="delivered").count()
        pending_payments = PurchasePayment.objects.filter(
            status=PurchasePayment.Status.PENDING_APPROVAL,
        ).count()
        pending_amount = PurchasePayment.objects.filter(
            status=PurchasePayment.Status.PENDING_APPROVAL,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        # Top suppliers by total amount
        top_suppliers = list(
            PurchaseOrderLine.objects
            .filter(purchase_order__in=po_qs)
            .values("purchase_order__supplier__name")
            .annotate(
                total=Sum("total_price"),
                orders_count=Count("purchase_order", distinct=True),
            )
            .order_by("-total")[:10]
        )

        # Supplier share (top supplier %)
        supplier_share = None
        if top_suppliers and total_amount > 0:
            top_total = Decimal(str(top_suppliers[0]["total"]))
            supplier_share = round(float(top_total / total_amount * 100), 1)

        # Average prices per product (top 20 most purchased)
        avg_prices = list(
            PurchaseOrderLine.objects
            .filter(purchase_order__in=po_qs, product__isnull=False)
            .values("product__name", "product__internal_code")
            .annotate(
                avg_price=Avg("unit_price"),
                total_qty=Sum("quantity"),
                orders_count=Count("purchase_order", distinct=True),
            )
            .order_by("-total_qty")[:20]
        )

        # Purchases by month (for chart)
        by_month = list(
            po_qs
            .filter(order_date__isnull=False)
            .extra(select={"month": "TO_CHAR(order_date, 'YYYY-MM')"})
            .values("month")
            .annotate(
                count=Count("id"),
                amount=Sum("lines__total_price"),
            )
            .order_by("month")
        )

        # Available years
        years = list(
            PurchaseOrder.objects
            .filter(order_date__isnull=False)
            .annotate(year=ExtractYear("order_date"))
            .values_list("year", flat=True)
            .distinct()
            .order_by("-year")
        )

        return Response({
            "summary": {
                "total_orders": total_orders,
                "total_amount": str(total_amount),
                "delivered": delivered,
                "pending_payments": pending_payments,
                "pending_amount": str(pending_amount),
            },
            "top_suppliers": [
                {
                    "name": s["purchase_order__supplier__name"],
                    "total": str(s["total"]),
                    "orders_count": s["orders_count"],
                }
                for s in top_suppliers
            ],
            "supplier_share": supplier_share,
            "avg_prices": [
                {
                    "name": p["product__name"],
                    "code": p["product__internal_code"],
                    "avg_price": str(round(p["avg_price"], 2)),
                    "total_qty": p["total_qty"],
                    "orders_count": p["orders_count"],
                }
                for p in avg_prices
            ],
            "by_month": [
                {
                    "month": m["month"],
                    "count": m["count"],
                    "amount": str(m["amount"] or 0),
                }
                for m in by_month
            ],
            "years": years,
        })
