from rest_framework import serializers

from apps.purchasing.models import (
    PurchaseOrder,
    PurchaseOrderFile,
    PurchaseOrderLine,
    PurchasePayment,
    PurchaseRequest,
    PurchaseRequestLine,
    StockItem,
    StockMovement,
    StockReservation,
    SupplierConditions,
)


# ── Stock ───────────────────────────────────────────────────────

class StockItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_code = serializers.CharField(source="product.internal_code", read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = StockItem
        fields = (
            "id", "product", "product_name", "product_code",
            "quantity", "reserved", "available",
        )
        read_only_fields = ("id", "quantity", "reserved")


class StockMovementSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True, default="")
    order_number = serializers.IntegerField(source="order.order_number", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = (
            "id", "movement_type", "quantity",
            "order", "order_number",
            "user", "user_name",
            "comment", "created_at",
        )
        read_only_fields = ("id", "created_at")


class StockReservationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="stock_item.product.name", read_only=True)
    order_number = serializers.IntegerField(source="order.order_number", read_only=True)
    reserved_by_name = serializers.CharField(source="reserved_by.get_full_name", read_only=True, default="")

    class Meta:
        model = StockReservation
        fields = (
            "id", "stock_item", "product_name",
            "order", "order_number",
            "quantity", "reserved_by", "reserved_by_name",
            "comment", "created_at",
        )
        read_only_fields = ("id", "created_at")


# ── Purchase Request ────────────────────────────────────────────

class PurchaseRequestLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)
    stock_available = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequestLine
        fields = (
            "id", "product", "product_name", "name",
            "quantity", "target_description", "note",
            "stock_available",
        )
        read_only_fields = ("id",)

    def get_stock_available(self, obj) -> int | None:
        if not obj.product_id:
            return None
        try:
            return obj.product.stock_item.available
        except StockItem.DoesNotExist:
            return 0


class PurchaseRequestListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")
    order_number = serializers.IntegerField(source="order.order_number", read_only=True)
    lines_count = serializers.IntegerField(source="lines.count", read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = (
            "id", "order", "order_number",
            "created_by", "created_by_name",
            "status", "required_date", "note",
            "lines_count", "created_at",
        )
        read_only_fields = ("id", "created_at")


class PurchaseRequestDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")
    order_number = serializers.IntegerField(source="order.order_number", read_only=True)
    lines = PurchaseRequestLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = (
            "id", "order", "order_number",
            "created_by", "created_by_name",
            "status", "required_date", "note",
            "lines", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ── Purchase Order ──────────────────────────────────────────────

class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)

    class Meta:
        model = PurchaseOrderLine
        fields = (
            "id", "product", "product_name", "name",
            "quantity", "unit_price", "total_price",
            "delivery_date", "delivered_quantity", "note",
        )
        read_only_fields = ("id", "total_price")


class PurchaseOrderFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderFile
        fields = ("id", "file", "original_name", "file_size", "description", "created_at")
        read_only_fields = ("id", "file_size", "created_at")


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    purchaser_name = serializers.CharField(source="purchaser.get_full_name", read_only=True, default="")
    order_number = serializers.IntegerField(source="order.order_number", read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    lines_count = serializers.IntegerField(source="lines.count", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = (
            "id", "supplier", "supplier_name",
            "order", "order_number",
            "purchaser", "purchaser_name",
            "status", "order_date", "expected_date",
            "total_amount", "lines_count",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    purchaser_name = serializers.CharField(source="purchaser.get_full_name", read_only=True, default="")
    order_number = serializers.IntegerField(source="order.order_number", read_only=True, default=None)
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    files = PurchaseOrderFileSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = (
            "id", "supplier", "supplier_name",
            "order", "order_number",
            "purchase_request",
            "purchaser", "purchaser_name",
            "status", "order_date", "expected_date", "note",
            "total_amount", "lines", "files",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ── Supplier Conditions ────────────────────────────────────────

class SupplierConditionsSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = SupplierConditions
        fields = (
            "id", "supplier", "supplier_name",
            "discount_percent", "payment_terms",
            "delivery_terms", "notes",
        )
        read_only_fields = ("id",)


# ── Payment ─────────────────────────────────────────────────────

class PurchasePaymentSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default="")
    supplier_name = serializers.CharField(source="purchase_order.supplier.name", read_only=True)

    class Meta:
        model = PurchasePayment
        fields = (
            "id", "purchase_order", "supplier_name",
            "amount", "payment_date", "due_date",
            "status", "approved_by", "approved_by_name",
            "invoice_file", "invoice_number", "note",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
