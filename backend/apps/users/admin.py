from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group

from .models import GroupProfile, User


class GroupProfileInline(admin.StackedInline):
    model = GroupProfile
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
        "department",
        "position",
        "is_active",
    )
    list_filter = ("is_active", "is_staff", "department", "company")
    search_fields = ("username", "first_name", "last_name", "patronymic", "email")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Дополнительно",
            {
                "fields": (
                    "patronymic",
                    "phone",
                    "extension_number",
                    "position",
                    "department",
                    "company",
                    "avatar",
                ),
            },
        ),
    )


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin):
    inlines = [GroupProfileInline]
