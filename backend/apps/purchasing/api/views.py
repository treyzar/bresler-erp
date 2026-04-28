from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins.export import ExportMixin
from apps.core.mixins.metadata import MetadataMixin
from apps.purchasing.models import (
    PurchaseOrder,
    PurchaseOrderFile,
    PurchasePayment,
    PurchaseRequest,
    StockItem,
    StockMovement,
    StockReservation,
    SupplierConditions,
)
from apps.purchasing.services import purchasing_service, stock_service

from .filters import (
    PurchaseOrderFilter,
    PurchasePaymentFilter,
    PurchaseRequestFilter,
    StockItemFilter,
)
from .serializers import (
    PurchaseOrderDetailSerializer,
    PurchaseOrderFileSerializer,
    PurchaseOrderLineSerializer,
    PurchaseOrderListSerializer,
    PurchasePaymentSerializer,
    PurchaseRequestDetailSerializer,
    PurchaseRequestLineSerializer,
    PurchaseRequestListSerializer,
    StockItemSerializer,
    StockMovementSerializer,
    StockReservationSerializer,
    SupplierConditionsSerializer,
)

# ── Stock ───────────────────────────────────────────────────────


class StockItemViewSet(MetadataMixin, ExportMixin, viewsets.ModelViewSet):
    queryset = StockItem.objects.select_related("product").all()
    serializer_class = StockItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = StockItemFilter
    search_fields = ["product__name", "product__internal_code"]
    ordering_fields = ["product__name", "quantity", "reserved"]
    export_fields = {
        "product__name": "Наименование",
        "product__internal_code": "Артикул",
        "quantity": "Количество",
        "reserved": "Резерв",
    }

    @action(detail=True, methods=["get"])
    def movements(self, request, pk=None):
        item = self.get_object()
        movements = StockMovement.objects.filter(stock_item=item).select_related("user", "order")[:100]
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reserve(self, request, pk=None):
        item = self.get_object()
        order_id = request.data.get("order")
        quantity = int(request.data.get("quantity", 0))
        comment = request.data.get("comment", "")
        if not order_id or quantity <= 0:
            return Response({"detail": "Укажите заказ и количество"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.orders.models import Order

        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response({"detail": "Заказ не найден"}, status=status.HTTP_404_NOT_FOUND)
        try:
            reservation = stock_service.reserve_stock(item, order, quantity, request.user, comment)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StockReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def unreserve(self, request, pk=None):
        item = self.get_object()
        order_id = request.data.get("order")
        try:
            reservation = StockReservation.objects.get(stock_item=item, order_id=order_id)
        except StockReservation.DoesNotExist:
            return Response({"detail": "Бронирование не найдено"}, status=status.HTTP_404_NOT_FOUND)
        stock_service.unreserve_stock(reservation, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        item = self.get_object()
        quantity = int(request.data.get("quantity", 0))
        comment = request.data.get("comment", "")
        if quantity <= 0:
            return Response({"detail": "Укажите количество"}, status=status.HTTP_400_BAD_REQUEST)
        movement = stock_service.receive_stock(item, quantity, request.user, comment)
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


# ── Purchase Request ────────────────────────────────────────────


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.select_related("order", "created_by").prefetch_related("lines").all()
    permission_classes = [IsAuthenticated]
    filterset_class = PurchaseRequestFilter
    search_fields = ["order__order_number", "note"]
    ordering_fields = ["created_at", "required_date", "status"]

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseRequestListSerializer
        return PurchaseRequestDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        pr = self.get_object()
        try:
            purchasing_service.submit_request(pr, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchaseRequestDetailSerializer(pr).data)

    @action(detail=True, methods=["get", "post"])
    def lines(self, request, pk=None):
        pr = self.get_object()
        if request.method == "GET":
            serializer = PurchaseRequestLineSerializer(pr.lines.all(), many=True)
            return Response(serializer.data)
        serializer = PurchaseRequestLineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(request=pr)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Purchase Order ──────────────────────────────────────────────


class PurchaseOrderViewSet(MetadataMixin, ExportMixin, viewsets.ModelViewSet):
    queryset = (
        PurchaseOrder.objects.select_related("supplier", "order", "purchaser", "purchase_request")
        .prefetch_related("lines", "files")
        .all()
    )
    permission_classes = [IsAuthenticated]
    filterset_class = PurchaseOrderFilter
    search_fields = ["supplier__name", "order__order_number", "note"]
    ordering_fields = ["created_at", "order_date", "expected_date", "status"]
    export_fields = {
        "supplier__name": "Поставщик",
        "order__order_number": "Заказ",
        "status": "Статус",
        "order_date": "Дата заказа",
        "expected_date": "Ожид. поставка",
    }
    meta_extra = {
        "supplier": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?business_role=supplier"},
        "date_from": {"range_group": "order_date"},
        "date_to": {"range_group": "order_date"},
    }

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        return PurchaseOrderDetailSerializer

    def perform_create(self, serializer):
        serializer.save(purchaser=self.request.user)

    @action(detail=True, methods=["get", "post"])
    def lines(self, request, pk=None):
        po = self.get_object()
        if request.method == "GET":
            serializer = PurchaseOrderLineSerializer(po.lines.all(), many=True)
            return Response(serializer.data)
        serializer = PurchaseOrderLineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(purchase_order=po)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="upload-file")
    def upload_file(self, request, pk=None):
        po = self.get_object()
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        po_file = PurchaseOrderFile.objects.create(
            purchase_order=po,
            file=file,
            original_name=file.name,
            file_size=file.size,
            description=request.data.get("description", ""),
        )
        return Response(PurchaseOrderFileSerializer(po_file).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="from-request")
    def from_request(self, request, pk=None):
        """Create purchase order from a purchase request."""
        request_id = request.data.get("request_id")
        if not request_id:
            return Response({"detail": "Укажите request_id"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pr = PurchaseRequest.objects.get(pk=request_id)
        except PurchaseRequest.DoesNotExist:
            return Response({"detail": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)
        po = self.get_object()
        po = purchasing_service.create_order_from_request(pr, po.supplier, request.user)
        return Response(PurchaseOrderDetailSerializer(po).data, status=status.HTTP_201_CREATED)


# ── Supplier Conditions ────────────────────────────────────────


class SupplierConditionsViewSet(viewsets.ModelViewSet):
    queryset = SupplierConditions.objects.select_related("supplier").all()
    serializer_class = SupplierConditionsSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["supplier__name"]


# ── Payment ─────────────────────────────────────────────────────


class PurchasePaymentViewSet(viewsets.ModelViewSet):
    queryset = PurchasePayment.objects.select_related("purchase_order__supplier", "approved_by").all()
    serializer_class = PurchasePaymentSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = PurchasePaymentFilter
    search_fields = ["invoice_number", "note"]
    ordering_fields = ["created_at", "due_date", "amount", "status"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        payment = self.get_object()
        try:
            purchasing_service.approve_payment(payment, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchasePaymentSerializer(payment).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        payment = self.get_object()
        try:
            purchasing_service.reject_payment(payment, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchasePaymentSerializer(payment).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        payment = self.get_object()
        try:
            purchasing_service.mark_payment_paid(payment)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchasePaymentSerializer(payment).data)

    @action(detail=False, methods=["get"], url_path="pending")
    def pending_approval(self, request):
        """Список оплат, ожидающих согласования."""
        qs = self.get_queryset().filter(status=PurchasePayment.Status.PENDING_APPROVAL)
        serializer = PurchasePaymentSerializer(qs, many=True)
        return Response(serializer.data)
