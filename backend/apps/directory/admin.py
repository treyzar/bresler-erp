from django.contrib import admin
from treebeard.admin import TreeAdmin
from treebeard.forms import movenodeform_factory

from .models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)


@admin.register(OrgUnit)
class OrgUnitAdmin(TreeAdmin):
    form = movenodeform_factory(OrgUnit)
    list_display = ("name", "unit_type", "business_role", "inn", "is_active")
    list_filter = ("unit_type", "business_role", "is_active")
    search_fields = ("name", "full_name", "inn", "external_code")


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "country")
    list_filter = ("country",)
    search_fields = ("name",)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "position", "email", "phone")
    search_fields = ("full_name", "email", "phone")
    filter_horizontal = ("org_units",)


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(TypeOfWork)
class TypeOfWorkAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(DeliveryType)
class DeliveryTypeAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ("name", "org_unit", "address", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "address")
    raw_id_fields = ("org_unit",)
