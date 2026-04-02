from django.contrib import admin

from apps.notifications.models import Notification, NotificationEntry, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "title", "category", "is_read", "created_at")
    list_filter = ("category", "is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__last_name")
    list_select_related = ("recipient",)
    raw_id_fields = ("recipient",)
    readonly_fields = ("created_at", "updated_at", "target_type", "target_id")
    date_hierarchy = "created_at"
    actions = ["mark_read", "mark_unread"]

    @admin.action(description="Отметить как прочитанные")
    def mark_read(self, request, queryset):
        count = queryset.filter(is_read=False).update(is_read=True)
        self.message_user(request, f"Отмечено прочитанными: {count}")

    @admin.action(description="Отметить как непрочитанные")
    def mark_unread(self, request, queryset):
        count = queryset.filter(is_read=True).update(is_read=False)
        self.message_user(request, f"Отмечено непрочитанными: {count}")


@admin.register(NotificationEntry)
class NotificationEntryAdmin(admin.ModelAdmin):
    list_display = ("key", "uid", "recipient", "updated")
    list_filter = ("key",)
    search_fields = ("key", "recipient__username")
    raw_id_fields = ("recipient",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "order_created",
        "order_status_changed",
        "order_deadline",
        "contract_payment",
        "comments",
        "import_completed",
    )
    list_filter = ("order_status_changed", "order_deadline")
    search_fields = ("user__username", "user__last_name")
    raw_id_fields = ("user",)
