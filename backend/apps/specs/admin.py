from django.contrib import admin

from .models import (
    CommercialOffer,
    OfferWorkItem,
    ParticipantContact,
    Specification,
    SpecificationLine,
)


class OfferWorkItemInline(admin.TabularInline):
    model = OfferWorkItem
    extra = 0


class SpecificationLineInline(admin.TabularInline):
    model = SpecificationLine
    extra = 0


@admin.register(CommercialOffer)
class CommercialOfferAdmin(admin.ModelAdmin):
    list_display = ("offer_number", "order", "participant", "version", "status", "date")
    list_filter = ("status", "date")
    search_fields = ("offer_number", "order__order_number")
    inlines = [OfferWorkItemInline]


@admin.register(Specification)
class SpecificationAdmin(admin.ModelAdmin):
    list_display = ("offer", "total_amount", "total_amount_with_vat")
    inlines = [SpecificationLineInline]


@admin.register(ParticipantContact)
class ParticipantContactAdmin(admin.ModelAdmin):
    list_display = ("participant", "contact", "is_primary")
    list_filter = ("is_primary",)
