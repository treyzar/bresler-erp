from decimal import Decimal

from django.db.models import Avg, Count, F, Max, Min, Q, Sum, Subquery, OuterRef
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

        # ── Price comparison: purchase price vs KP (specification) price ──
        price_comparison = self._get_price_comparison(po_qs)

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

        # ── Forecast: yearly totals + projected current year ──
        forecast = self._get_forecast()

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
            "price_comparison": price_comparison,
            "by_month": [
                {
                    "month": m["month"],
                    "count": m["count"],
                    "amount": str(m["amount"] or 0),
                }
                for m in by_month
            ],
            "forecast": forecast,
            "years": years,
        })

    def _get_price_comparison(self, po_qs):
        """Compare purchase prices vs KP (specification) prices for same products."""
        from apps.specs.models import SpecificationLine

        # Get products that exist both in purchases and specifications
        purchased_products = (
            PurchaseOrderLine.objects
            .filter(purchase_order__in=po_qs, product__isnull=False)
            .values("product_id", "product__name", "product__internal_code")
            .annotate(
                purchase_avg=Avg("unit_price"),
                purchase_min=Min("unit_price"),
                purchase_max=Max("unit_price"),
                purchase_qty=Sum("quantity"),
            )
        )

        result = []
        for p in purchased_products[:30]:
            # KP prices for the same product
            kp_data = (
                SpecificationLine.objects
                .filter(product_id=p["product_id"])
                .aggregate(
                    kp_avg=Avg("unit_price"),
                    kp_min=Min("unit_price"),
                    kp_max=Max("unit_price"),
                    kp_count=Count("id"),
                )
            )
            if kp_data["kp_count"] and kp_data["kp_count"] > 0:
                margin = None
                if p["purchase_avg"] and kp_data["kp_avg"] and p["purchase_avg"] > 0:
                    margin = round(
                        float((kp_data["kp_avg"] - p["purchase_avg"]) / p["purchase_avg"] * 100), 1,
                    )
                result.append({
                    "name": p["product__name"],
                    "code": p["product__internal_code"],
                    "purchase_avg": str(round(p["purchase_avg"], 2)),
                    "purchase_min": str(round(p["purchase_min"], 2)),
                    "purchase_max": str(round(p["purchase_max"], 2)),
                    "kp_avg": str(round(kp_data["kp_avg"], 2)),
                    "kp_min": str(round(kp_data["kp_min"], 2)),
                    "kp_max": str(round(kp_data["kp_max"], 2)),
                    "margin_percent": margin,
                })
        return sorted(result, key=lambda x: x["margin_percent"] or 0, reverse=True)

    def _get_forecast(self):
        """Yearly purchasing totals + linear projection for current year."""
        from django.utils import timezone

        current_year = timezone.now().year

        by_year = list(
            PurchaseOrder.objects
            .filter(order_date__isnull=False)
            .annotate(year=ExtractYear("order_date"))
            .values("year")
            .annotate(
                count=Count("id"),
                amount=Sum("lines__total_price"),
            )
            .order_by("year")
        )

        yearly = [
            {
                "year": r["year"],
                "count": r["count"],
                "amount": str(r["amount"] or 0),
                "is_forecast": False,
            }
            for r in by_year
        ]

        # Linear forecast for current year (if we have 2+ past years)
        past_years = [r for r in by_year if r["year"] < current_year]
        current_data = next((r for r in by_year if r["year"] == current_year), None)

        if len(past_years) >= 2:
            # Simple linear regression on amounts
            amounts = [float(r["amount"] or 0) for r in past_years]
            n = len(amounts)
            x_mean = sum(range(n)) / n
            y_mean = sum(amounts) / n
            numerator = sum((i - x_mean) * (a - y_mean) for i, a in enumerate(amounts))
            denominator = sum((i - x_mean) ** 2 for i in range(n))
            if denominator > 0:
                slope = numerator / denominator
                intercept = y_mean - slope * x_mean
                projected = max(0, intercept + slope * n)

                if not current_data:
                    yearly.append({
                        "year": current_year,
                        "count": 0,
                        "amount": str(round(projected, 2)),
                        "is_forecast": True,
                    })
                else:
                    # Add projected as separate entry
                    yearly.append({
                        "year": current_year,
                        "count": 0,
                        "amount": str(round(projected, 2)),
                        "is_forecast": True,
                        "label": "Прогноз",
                    })

        return yearly


class BOMCostView(APIView):
    """Calculate product cost from BOM + latest purchase prices."""

    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        from apps.devices.models import Product, ProductBOMLine

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "Продукт не найден"}, status=404)

        bom_lines = ProductBOMLine.objects.filter(parent=product).select_related("child")
        if not bom_lines.exists():
            return Response({
                "product": {"id": product.id, "name": product.name, "code": product.internal_code},
                "bom_lines": [],
                "total_cost": "0.00",
                "base_price": str(product.base_price),
                "margin_percent": None,
            })

        lines = []
        total_cost = Decimal("0.00")

        for bom in bom_lines:
            child = bom.child
            # Latest purchase price for this component
            latest_purchase = (
                PurchaseOrderLine.objects
                .filter(product=child, purchase_order__status__in=["ordered", "delivered"])
                .order_by("-purchase_order__order_date")
                .values_list("unit_price", flat=True)
                .first()
            )
            # Average purchase price
            avg_purchase = (
                PurchaseOrderLine.objects
                .filter(product=child, purchase_order__status__in=["ordered", "delivered"])
                .aggregate(avg=Avg("unit_price"))
            )["avg"]

            unit_cost = latest_purchase or child.base_price or Decimal("0.00")
            line_cost = unit_cost * bom.quantity

            lines.append({
                "component_id": child.id,
                "component_name": child.name,
                "component_code": child.internal_code,
                "role": bom.role,
                "quantity": bom.quantity,
                "base_price": str(child.base_price or "0.00"),
                "latest_purchase_price": str(latest_purchase) if latest_purchase else None,
                "avg_purchase_price": str(round(avg_purchase, 2)) if avg_purchase else None,
                "unit_cost": str(unit_cost),
                "line_cost": str(line_cost),
            })
            total_cost += line_cost

        margin = None
        if product.base_price and total_cost > 0:
            margin = round(float((product.base_price - total_cost) / total_cost * 100), 1)

        return Response({
            "product": {"id": product.id, "name": product.name, "code": product.internal_code},
            "bom_lines": lines,
            "total_cost": str(total_cost.quantize(Decimal("0.01"))),
            "base_price": str(product.base_price or "0.00"),
            "margin_percent": margin,
        })
