from django.urls import path
from rest_framework.routers import DefaultRouter

from .dashboard import BOMCostView, PurchasingDashboardView
from .views import (
    PurchaseOrderViewSet,
    PurchasePaymentViewSet,
    PurchaseRequestViewSet,
    StockItemViewSet,
    SupplierConditionsViewSet,
)

router = DefaultRouter()
router.register("stock", StockItemViewSet, basename="stock")
router.register("purchase-requests", PurchaseRequestViewSet, basename="purchase-request")
router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register("supplier-conditions", SupplierConditionsViewSet, basename="supplier-conditions")
router.register("payments", PurchasePaymentViewSet, basename="purchase-payment")

urlpatterns = [
    path("dashboard/", PurchasingDashboardView.as_view(), name="purchasing-dashboard"),
    path("bom-cost/<int:product_id>/", BOMCostView.as_view(), name="bom-cost"),
] + router.urls
