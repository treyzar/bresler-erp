from django import forms
from django.contrib import admin
from treebeard.admin import TreeAdmin
from treebeard.forms import MoveNodeForm, movenodeform_factory

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


class SafeMoveNodeForm(MoveNodeForm):
    """Подкласс MoveNodeForm, который вызывает .move() только если пользователь
    действительно изменил _position или _ref_node_id.

    Оригинал всегда дёргает move() на существующих узлах — при
    node_order_by=['name'] и большом дереве (5000+ узлов) move() пересчитывает
    path по алфавиту и может приземлиться на уже занятый путь (IntegrityError).
    Проверка по changed_data позволяет безопасно сохранять простые правки
    полей без затрагивания дерева.
    """

    def save(self, commit=True):
        touched_tree = {"_position", "_ref_node_id"} & set(self.changed_data)
        position_type, reference_node_id = self._clean_cleaned_data()

        if self.instance._state.adding:
            # Новый узел — логика как в оригинале.
            if reference_node_id:
                ref = self._meta.model.objects.get(pk=reference_node_id)
                self.instance = ref.add_child(instance=self.instance)
                if not self.is_sorted:
                    self.instance.move(ref, pos=position_type)
            else:
                self.instance = self._meta.model.add_root(instance=self.instance)
            self.instance.refresh_from_db()
        else:
            # Существующий узел: только если пользователь реально изменил дерево.
            if touched_tree:
                if reference_node_id:
                    ref = self._meta.model.objects.get(pk=reference_node_id)
                    self.instance.move(ref, pos=position_type)
                else:
                    pos = "sorted-sibling" if self.is_sorted else "first-sibling"
                    self.instance.move(self._meta.model.get_first_root_node(), pos)
                self.instance.refresh_from_db()

        # ModelForm.save нужен в любой ветке — он регистрирует save_m2m.
        forms.ModelForm.save(self, commit=commit)
        return self.instance


_OrgUnitAdminForm = movenodeform_factory(OrgUnit, form=SafeMoveNodeForm)


@admin.register(OrgUnit)
class OrgUnitAdmin(TreeAdmin):
    form = _OrgUnitAdminForm
    list_display = ("name", "unit_type", "business_role", "inn", "is_active")
    list_filter = ("unit_type", "business_role", "is_active")
    search_fields = ("name", "full_name", "inn", "external_code")


_DepartmentAdminForm = movenodeform_factory(Department, form=SafeMoveNodeForm)


@admin.register(Department)
class DepartmentAdmin(TreeAdmin):
    form = _DepartmentAdminForm
    list_display = ("name", "unit_type", "company", "is_active")
    list_filter = ("unit_type", "company", "is_active")
    search_fields = ("name", "full_name")
    # autocomplete_fields намеренно НЕ используем для company: он идёт через
    # OrgUnitAdmin.get_search_results, где нет способа ограничить выдачу по
    # business_role. Обычный select фильтруется через formfield_for_foreignkey.

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "company":
            # В выпадающем списке — только наши юрлица (business_role='internal').
            kwargs["queryset"] = OrgUnit.objects.filter(
                business_role="internal", is_active=True,
            ).order_by("name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


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
