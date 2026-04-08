from django.contrib import admin

from .models import (
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


class PurchaseRequestLineInline(admin.TabularInline):
    model = PurchaseRequestLine
    extra = 0


class PurchaseOrderLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0


class PurchaseOrderFileInline(admin.TabularInline):
    model = PurchaseOrderFile
    extra = 0


class PurchasePaymentInline(admin.TabularInline):
    model = PurchasePayment
    extra = 0


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity", "reserved", "available")
    search_fields = ("product__name",)

    @admin.display(description="Доступно")
    def available(self, obj):
        return obj.available


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("stock_item", "movement_type", "quantity", "user", "created_at")
    list_filter = ("movement_type",)


@admin.register(StockReservation)
class StockReservationAdmin(admin.ModelAdmin):
    list_display = ("stock_item", "order", "quantity", "reserved_by", "created_at")


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "created_by", "status", "required_date", "created_at")
    list_filter = ("status",)
    inlines = [PurchaseRequestLineInline]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier", "order", "purchaser", "status", "order_date", "created_at")
    list_filter = ("status",)
    search_fields = ("supplier__name",)
    inlines = [PurchaseOrderLineInline, PurchaseOrderFileInline, PurchasePaymentInline]


@admin.register(SupplierConditions)
class SupplierConditionsAdmin(admin.ModelAdmin):
    list_display = ("supplier", "discount_percent", "payment_terms")
    search_fields = ("supplier__name",)


@admin.register(PurchasePayment)
class PurchasePaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "purchase_order", "amount", "status", "due_date", "approved_by")
    list_filter = ("status",)
