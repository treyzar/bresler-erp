from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminApprovalChainTemplateViewSet,
    AdminDocumentTypeViewSet,
    DocumentTypeViewSet,
    DocumentViewSet,
    bulk_cancel,
    bulk_remind,
    email_action,
    export_archive_zip,
    report_sla_breaches,
    report_stuck_documents,
    report_top_by_type,
)

router = DefaultRouter()
router.register(r"types", DocumentTypeViewSet, basename="document-type")
router.register(r"documents", DocumentViewSet, basename="document")

admin_router = DefaultRouter()
admin_router.register(r"types", AdminDocumentTypeViewSet, basename="admin-document-type")
admin_router.register(r"chains", AdminApprovalChainTemplateViewSet, basename="admin-chain")

urlpatterns = [
    path("", include(router.urls)),
    path("admin/", include(admin_router.urls)),
    path("admin/reports/stuck-documents/", report_stuck_documents, name="report-stuck-documents"),
    path("admin/reports/sla-breaches/", report_sla_breaches, name="report-sla-breaches"),
    path("admin/reports/top-by-type/", report_top_by_type, name="report-top-by-type"),
    path("admin/bulk-cancel/", bulk_cancel, name="bulk-cancel"),
    path("admin/bulk-remind/", bulk_remind, name="bulk-remind"),
    path("admin/export-archive-zip/", export_archive_zip, name="export-archive-zip"),
    # Публичная ссылка из email — авторизация по подписанному токену.
    path("email-action/<str:token>/", email_action, name="email-action"),
]
