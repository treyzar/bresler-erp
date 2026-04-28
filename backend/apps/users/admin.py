from django import forms
from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group

from apps.directory.models import Department, OrgUnit

from .models import GroupProfile, User
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


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "last_name",
        "first_name",
        "patronymic",
        "department_unit",
        "company_unit",
        "position",
        "is_department_head",
        "is_active",
    )
    list_filter = (
        "is_active",
        "is_staff",
        "is_department_head",
        "company_unit",
        "department_unit",
    )
    search_fields = ("username", "first_name", "last_name", "patronymic", "email")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Организация",
            {
                "fields": (
                    "company_unit",
                    "department_unit",
                    "supervisor",
                    "is_department_head",
                ),
                "description": (
                    "company_unit — наше юрлицо (OrgUnit с business_role=internal). "
                    "department_unit — конкретное подразделение (Служба/Отдел/Сектор). "
                    "supervisor — явное переопределение руководителя; если пусто, "
                    "система ищет head по дереву department_unit автоматически."
                ),
            },
        ),
        (
            "Замещение",
            {
                "fields": (
                    "substitute_user",
                    "substitute_from",
                    "substitute_until",
                ),
                "description": (
                    "Когда сотрудник в отпуске — все его новые EDO-шаги (WAITING → "
                    "PENDING) автоматически переадресуются substitute_user в окне "
                    "[substitute_from, substitute_until]. Уже PENDING-шаги "
                    "не перерезолвятся — для них нужна ручная «Делегировать» в UI. "
                    "Любая граница может быть пустой (бессрочное замещение)."
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
                    "position",
                    "avatar",
                ),
            },
        ),
        (
            "Legacy-поля (readonly shadow)",
            {
                "classes": ("collapse",),
                "fields": ("department", "company"),
                "description": (
                    "Текстовые значения автоматически подтягиваются из "
                    "department_unit/company_unit через pre_save сигнал. "
                    "Не редактируй вручную — перезапишется при следующем save."
                ),
            },
        ),
    )
    readonly_fields = ("department", "company")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "company_unit":
            kwargs["queryset"] = OrgUnit.objects.filter(
                business_role="internal",
                is_active=True,
            ).order_by("name")
        elif db_field.name == "department_unit":
            kwargs["queryset"] = (
                Department.objects.filter(
                    is_active=True,
                )
                .select_related("company")
                .order_by("company__name", "name")
            )
        elif db_field.name == "supervisor":
            kwargs["queryset"] = User.objects.filter(is_active=True).order_by(
                "last_name",
                "first_name",
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin):
    inlines = [GroupProfileInline]
