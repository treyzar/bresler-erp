from django import forms
from django.contrib import admin
from treebeard.admin import TreeAdmin

from .models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Department,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)


# Примечание по формам ниже: не используем `movenodeform_factory` для change-view.
# Эта форма добавляет скрытые поля _position/_ref_node_id и на save() вызывает
# .move(), пытаясь переставить узел по алфавиту — при больших деревьях
# и node_order_by=['name'] это конфликтует с уже занятыми path (IntegrityError).
# Для перестановки по дереву используйте drag-drop в списке (TreeAdmin сам его
# рисует) или add_child()/move() через shell.


class _OrgUnitAdminForm(forms.ModelForm):
    class Meta:
        model = OrgUnit
        # Все поля, кроме служебных MP_Node (path/depth/numchild).
        fields = [
            "name", "full_name", "unit_type", "business_role",
            "is_legal_entity", "country", "inn", "kpp", "ogrn",
            "external_code", "address", "is_active",
        ]


@admin.register(OrgUnit)
class OrgUnitAdmin(TreeAdmin):
    form = _OrgUnitAdminForm
    list_display = ("name", "unit_type", "business_role", "inn", "is_active")
    list_filter = ("unit_type", "business_role", "is_active")
    search_fields = ("name", "full_name", "inn", "external_code")

    def save_model(self, request, obj, form, change):
        if change:
            obj.save()
            return
        # Новый узел: используем add_root (MP_Node требует path/depth).
        # Иерархию можно править потом drag-drop'ом в списке.
        field_values = {
            f.name: getattr(obj, f.name)
            for f in obj._meta.concrete_fields
            if f.name not in {"id", "path", "depth", "numchild"}
        }
        new_obj = OrgUnit.add_root(**field_values)
        obj.pk = new_obj.pk
        obj.path = new_obj.path
        obj.depth = new_obj.depth


class _DepartmentAdminForm(forms.ModelForm):
    class Meta:
        model = Department
        fields = [
            "name", "full_name", "unit_type", "company",
            "description", "is_active",
        ]


@admin.register(Department)
class DepartmentAdmin(TreeAdmin):
    form = _DepartmentAdminForm
    list_display = ("name", "unit_type", "company", "is_active")
    list_filter = ("unit_type", "company", "is_active")
    search_fields = ("name", "full_name")
    # autocomplete_fields намеренно НЕ используем для company: он идёт через
    # OrgUnitAdmin.get_search_results, где нет способа ограничить выдачу по
    # business_role без вмешательства в OrgUnitAdmin. Обычный select с
    # queryset'ом из formfield_for_foreignkey фильтрует надёжно.

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "company":
            # В выпадающем списке — только наши юрлица (business_role='internal').
            kwargs["queryset"] = OrgUnit.objects.filter(
                business_role="internal", is_active=True,
            ).order_by("name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if change:
            obj.save()
            return
        # Новый узел: всегда создаётся как корень дерева. Вложенность
        # (Служба → Отдел → Сектор) настраивается drag-drop'ом в списке
        # или через shell: `parent.add_child(instance=child)`.
        field_values = {
            f.name: getattr(obj, f.name)
            for f in obj._meta.concrete_fields
            if f.name not in {"id", "path", "depth", "numchild"}
        }
        new_obj = Department.add_root(**field_values)
        obj.pk = new_obj.pk
        obj.path = new_obj.path
        obj.depth = new_obj.depth


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
    list_display = ("full_name", "position", "email", "phone", "org_unit")
    search_fields = ("full_name", "email", "phone")
    raw_id_fields = ("org_unit",)


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
