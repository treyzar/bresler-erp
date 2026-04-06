from django.contrib import admin

from .models import Contract, DocumentTemplate, Order, OrderFile, OrderOrgUnit, OrderParticipant


class OrderOrgUnitInline(admin.TabularInline):
    model = OrderOrgUnit
    extra = 0


class OrderParticipantInline(admin.TabularInline):
    model = OrderParticipant
    extra = 0


class OrderFileInline(admin.TabularInline):
    model = OrderFile
    extra = 0
    readonly_fields = ("file_size",)


class ContractInline(admin.StackedInline):
    model = Contract
    extra = 0
    max_num = 1


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "status",
        "customer_org_unit",
        "start_date",
        "ship_date",
        "created_at",
    )
    list_filter = ("status", "country")
    search_fields = ("order_number", "tender_number", "note")
    inlines = [ContractInline, OrderOrgUnitInline, OrderParticipantInline, OrderFileInline]
    filter_horizontal = ("contacts", "managers", "equipments", "works", "related_orders")


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "document_type", "entity", "is_active")
    list_filter = ("entity", "document_type", "is_active")
    search_fields = ("name",)
