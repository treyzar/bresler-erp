from django import forms
from django.contrib import admin
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.db.models import Q
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
    OrgUnitHead,
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


_DepartmentBaseForm = movenodeform_factory(Department, form=SafeMoveNodeForm)


class DepartmentAdminForm(_DepartmentBaseForm):
    """Расширение формы Department: двухпанельный пикер сотрудников.

    Backs to `User.department_unit` (reverse FK). Семантика как у обычного
    M2M-пикера: пользователь в правой колонке → его `department_unit`
    выставляется в этот Department; убрали → `department_unit=None`.
    Пользователи вне queryset (неактивные и не состоящие сейчас в этом
    подразделении) не трогаются — на них этот виджет не влияет.
    """

    employees = forms.ModelMultipleChoiceField(
        queryset=None,
        required=False,
        label="Сотрудники подразделения",
        help_text=(
            "Стрелками перенесите пользователей вправо, чтобы прикрепить их "
            "к этому подразделению. Снятие галочки очищает User.department_unit "
            "(Компания подтянется автоматически из подразделения при сохранении)."
        ),
        widget=FilteredSelectMultiple("Сотрудники", is_stacked=False),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.users.models import User as UserModel

        if self.instance and self.instance.pk:
            qs = UserModel.objects.filter(
                Q(is_active=True) | Q(department_unit=self.instance),
            ).distinct()
            self.fields["employees"].initial = list(
                UserModel.objects.filter(department_unit=self.instance).values_list(
                    "pk", flat=True,
                ),
            )
        else:
            qs = UserModel.objects.filter(is_active=True)

        self.fields["employees"].queryset = qs.order_by(
            "last_name", "first_name", "username",
        )


@admin.register(Department)
class DepartmentAdmin(TreeAdmin):
    form = DepartmentAdminForm
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
                business_role="internal",
                is_active=True,
            ).order_by("name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        from apps.users.models import User as UserModel

        instance = form.instance
        if not instance.pk:
            return
        selected = form.cleaned_data.get("employees")
        if selected is None:
            return

        selected_pks = set(selected.values_list("pk", flat=True))
        # Универсум — те, кого виджет реально показывал. Только их и трогаем.
        universe_pks = set(
            form.fields["employees"].queryset.values_list("pk", flat=True),
        )
        current_pks = set(
            UserModel.objects.filter(
                department_unit=instance, pk__in=universe_pks,
            ).values_list("pk", flat=True),
        )

        to_add = selected_pks - current_pks
        to_remove = current_pks - selected_pks

        # save() (а не bulk update()) — чтобы pre_save signal синхронизировал
        # legacy-строки User.department/company и подтянул company_unit.
        for user in UserModel.objects.filter(pk__in=to_add):
            user.department_unit = instance
            user.save()
        for user in UserModel.objects.filter(pk__in=to_remove):
            user.department_unit = None
            user.save()


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


@admin.register(OrgUnitHead)
class OrgUnitHeadAdmin(admin.ModelAdmin):
    list_display = ("org_unit", "head_name", "head_position", "from_date", "to_date")
    list_filter = ("org_unit",)
    search_fields = ("head_name", "head_position", "org_unit__name")
    raw_id_fields = ("org_unit",)
    date_hierarchy = "from_date"
