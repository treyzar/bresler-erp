from django import forms
from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.forms.models import ModelChoiceIteratorValue

from apps.directory.models import Department, OrgUnit

from .models import Assignment, GroupProfile, User
from .modules import module_choices


class AllowedModulesWidget(forms.CheckboxSelectMultiple):
    """CheckboxSelectMultiple, значение которого — обычный JSON-list строк."""


class GroupProfileForm(forms.ModelForm):
    allowed_modules = forms.MultipleChoiceField(
        choices=module_choices,
        widget=AllowedModulesWidget,
        required=False,
        label="Доступные модули",
        help_text=(
            "Чек-боксы с доступом к модулям. Список модулей управляется в "
            "apps/users/modules.py — добавил новый app там, он появится здесь."
        ),
    )

    class Meta:
        model = GroupProfile
        fields = ("description", "allowed_modules")


class GroupProfileInline(admin.StackedInline):
    model = GroupProfile
    form = GroupProfileForm
    can_delete = False
    verbose_name_plural = "Доступ к модулям"
    fields = ("description", "allowed_modules")


class CompanyAwareDepartmentSelect(forms.Select):
    """`<select>` для Department, добавляющий `data-company-id` на каждый
    `<option>`. Используется парой с `assignment_cascade.js`, который при
    смене company скрывает департаменты других компаний.
    """

    def __init__(self, attrs=None, choices=(), department_to_company=None):
        super().__init__(attrs, choices)
        self.department_to_company = department_to_company or {}

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        raw = value.value if isinstance(value, ModelChoiceIteratorValue) else value
        if raw:
            try:
                cid = self.department_to_company.get(int(raw))
            except (TypeError, ValueError):
                cid = None
            if cid:
                option["attrs"]["data-company-id"] = str(cid)
        return option


def _apply_assignment_field_filters(modeladmin, db_field, formfield):
    """Общий хелпер для AssignmentInline и AssignmentAdmin: фильтрует company
    до internal-only и оборачивает department в CompanyAwareDepartmentSelect
    с маппингом для каскадного фильтра.
    """
    if formfield is None:
        return formfield

    if db_field.name == "department":
        formfield.label_from_instance = lambda obj: f"{obj.company.name} / {obj.name}"
        mapping = dict(formfield.queryset.values_list("pk", "company_id"))
        outer = formfield.widget
        # admin оборачивает widget в RelatedFieldWidgetWrapper(orig_widget, ...)
        if hasattr(outer, "widget"):
            old = outer.widget
            new_select = CompanyAwareDepartmentSelect(
                attrs=getattr(old, "attrs", None) or {},
                choices=old.choices if hasattr(old, "choices") else formfield.choices,
                department_to_company=mapping,
            )
            outer.widget = new_select
        else:
            old = outer
            formfield.widget = CompanyAwareDepartmentSelect(
                attrs=getattr(old, "attrs", None) or {},
                choices=old.choices if hasattr(old, "choices") else formfield.choices,
                department_to_company=mapping,
            )
    return formfield


class AssignmentInline(admin.TabularInline):
    """Штатные назначения пользователя.

    Показывается на странице редактирования User'а. Здесь же выставляется
    `is_primary` — основное место работы (ровно одно на пользователя; БД
    запретит второе primary через UniqueConstraint).
    """

    model = Assignment
    extra = 0
    fk_name = "user"
    fields = (
        "company",
        "department",
        "position",
        "is_head",
        "is_primary",
        "is_active",
        "from_date",
        "to_date",
        "note",
    )
    autocomplete_fields = ()  # не используем — нужно фильтровать company по business_role
    show_change_link = True

    class Media:
        js = ("admin/js/assignment_cascade.js",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "company":
            kwargs["queryset"] = OrgUnit.objects.filter(
                business_role="internal",
                is_active=True,
            ).order_by("name")
        elif db_field.name == "department":
            kwargs["queryset"] = (
                Department.objects.filter(is_active=True)
                .select_related("company")
                .order_by("company__name", "name")
            )
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        return _apply_assignment_field_filters(self, db_field, formfield)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "last_name",
        "first_name",
        "patronymic",
        "primary_company_display",
        "primary_department_display",
        "primary_position_display",
        "is_active",
    )
    list_filter = (
        "is_active",
        "is_staff",
        "assignments__is_head",
        "assignments__company",
        "assignments__department",
    )
    search_fields = ("username", "first_name", "last_name", "patronymic", "email")

    inlines = [AssignmentInline]

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Замещение",
            {
                "fields": (
                    "supervisor",
                    "substitute_user",
                    "substitute_from",
                    "substitute_until",
                ),
                "description": (
                    "supervisor — явный override непосредственного руководителя; "
                    "если пусто, система ищет head по дереву Department "
                    "primary-assignment'а автоматически. "
                    "Замещение: новые шаги EDO в окне [from, until] переадресуются "
                    "substitute_user'у. Любая граница может быть пустой."
                ),
            },
        ),
        (
            "Персональные данные",
            {
                "fields": (
                    "patronymic",
                    "phone",
                    "extension_number",
                    "avatar",
                ),
            },
        ),
    )

    @admin.display(description="Компания (primary)")
    def primary_company_display(self, obj):
        a = obj.primary_assignment
        return a.company.name if a else "—"

    @admin.display(description="Подразделение (primary)")
    def primary_department_display(self, obj):
        a = obj.primary_assignment
        if not a:
            return "—"
        return a.department.name if a.department_id else "(уровень компании)"

    @admin.display(description="Должность (primary)")
    def primary_position_display(self, obj):
        a = obj.primary_assignment
        return (a.position if a else "") or "—"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "supervisor":
            kwargs["queryset"] = User.objects.filter(is_active=True).order_by(
                "last_name",
                "first_name",
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "company",
        "department",
        "position",
        "is_head",
        "is_primary",
        "is_active",
    )
    list_filter = ("is_head", "is_primary", "is_active", "company", "department")
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "position",
    )
    autocomplete_fields = ("user",)  # company/department идут обычными Select'ами с каскадом

    class Media:
        js = ("admin/js/assignment_cascade.js",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "company":
            kwargs["queryset"] = OrgUnit.objects.filter(
                business_role="internal",
                is_active=True,
            ).order_by("name")
        elif db_field.name == "department":
            kwargs["queryset"] = (
                Department.objects.filter(is_active=True)
                .select_related("company")
                .order_by("company__name", "name")
            )
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        return _apply_assignment_field_filters(self, db_field, formfield)


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin):
    inlines = [GroupProfileInline]
