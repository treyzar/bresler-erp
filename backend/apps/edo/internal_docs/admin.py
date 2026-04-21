from django.contrib import admin

from .models import (
    ApprovalChainTemplate,
    ApprovalStep,
    Document,
    DocumentAttachment,
    DocumentType,
    InternalDocFlowConfig,
)


@admin.register(InternalDocFlowConfig)
class InternalDocFlowConfigAdmin(admin.ModelAdmin):
    list_display = ("cross_company_scope", "default_sla_hours", "pdf_cache_ttl_hours", "updated_at")

    def has_add_permission(self, request):
        # Singleton — добавлять больше одной строки нельзя.
        return not InternalDocFlowConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ApprovalChainTemplate)
class ApprovalChainTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "is_default", "is_active", "updated_at")
    list_filter = ("is_default", "is_active")
    search_fields = ("name", "description")


@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "initiator_resolver", "is_active")
    list_filter = ("category", "initiator_resolver", "visibility", "is_active")
    search_fields = ("code", "name", "description")
    # numbering_sequence — обычный dropdown (их ~9 на весь модуль, места хватит)
    autocomplete_fields = ("default_chain",)


class ApprovalStepInline(admin.TabularInline):
    model = ApprovalStep
    extra = 0
    readonly_fields = (
        "order", "role_key", "role_label", "action",
        "approver", "original_approver", "decided_at", "sla_due_at",
    )
    fields = readonly_fields + ("status", "comment")
    can_delete = False


class DocumentAttachmentInline(admin.TabularInline):
    model = DocumentAttachment
    extra = 0
    readonly_fields = ("uploaded_by", "uploaded_at", "file_size")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("number", "type", "author", "status", "submitted_at", "closed_at")
    list_filter = ("status", "type", "submitted_at")
    search_fields = ("number", "title", "author__username", "author__last_name")
    autocomplete_fields = ("type", "author", "addressee", "author_company_unit", "author_department_unit")
    readonly_fields = ("number", "created_at", "submitted_at", "closed_at", "body_rendered", "chain_snapshot", "header_snapshot")
    inlines = [ApprovalStepInline, DocumentAttachmentInline]


# ApprovalStep + DocumentAttachment доступны через inline в Document — отдельная регистрация не нужна.
