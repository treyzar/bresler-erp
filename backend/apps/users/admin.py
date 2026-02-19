from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


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
