from django.contrib import admin

from .models import Letter, LetterFile


class LetterFileInline(admin.TabularInline):
    model = LetterFile
    extra = 0
    readonly_fields = ("file_name", "file_type", "file_size", "uploaded_at", "uploaded_by")
    fields = ("file", "file_name", "file_type", "file_size", "uploaded_by", "uploaded_at")


@admin.register(Letter)
class LetterAdmin(admin.ModelAdmin):
    list_display = ("number", "seq", "date", "direction", "subject", "executor", "created_by", "created_at")
    list_filter = ("direction", "date", "executor")
    search_fields = ("number", "subject", "recipient", "sender")
    readonly_fields = ("number", "seq", "created_by", "created_at", "updated_at")
    ordering = ("-seq",)
    date_hierarchy = "date"
    inlines = [LetterFileInline]

    fieldsets = (
        (None, {
            "fields": ("number", "seq", "date", "direction"),
        }),
        ("Контрагент", {
            "fields": ("recipient", "sender"),
        }),
        ("Содержание", {
            "fields": ("subject", "note"),
        }),
        ("Ответственные", {
            "fields": ("executor", "created_by"),
        }),
        ("Служебное", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LetterFile)
class LetterFileAdmin(admin.ModelAdmin):
    list_display = ("file_name", "file_type", "file_size", "letter", "uploaded_by", "uploaded_at")
    list_filter = ("file_type",)
    search_fields = ("file_name", "letter__number")
    readonly_fields = ("file_name", "file_type", "file_size", "uploaded_at", "uploaded_by")
