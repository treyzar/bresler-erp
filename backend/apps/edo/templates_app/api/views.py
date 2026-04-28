# apps/templates_app/views.py

import json
import logging
import re
from typing import Any

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from ..models.models import ShareLink, Template, TemplateVersion
from ..services.docx_builder import DocxBuilderService
from ..services.html_renderer import render_editor_content_html
from ..services.pdf_export import PDFExportService
from .serializers import (
    RenderSerializer,
    ShareLinkSerializer,
    TemplateListSerializer,
    TemplateSerializer,
    TemplateVersionSerializer,
)

# Настройка логгера
logger = logging.getLogger(__name__)

CURRENT_USER_ID = getattr(settings, "CURRENT_USER_ID", 1)


def _get_base_url_from_request(request) -> str:
    """Получает базовый URL для загрузки ресурсов"""
    site_url = getattr(settings, "SITE_URL", None)
    if site_url:
        return str(site_url)
    return request.build_absolute_uri("/")


def _safe_filename(name: str, default: str = "document") -> str:
    """Очищает имя файла от недопустимых символов"""
    name = (name or default).strip()
    name = re.sub(r'["\r\n<>:"/\\|?*]', "", name)
    return name or default


def _apply_placeholders_html(html_content: str, values: dict[str, Any]) -> str:
    """Fallback: подстановка в готовый HTML (для legacy-шаблонов без editor_content)."""
    result = html_content or ""
    for key, value in (values or {}).items():
        k = str(key)
        v = "" if value is None else str(value)
        pattern = r"\{\{\s*" + re.escape(k) + r"\s*\}\}"
        result = re.sub(pattern, lambda _m, vv=v: vv, result)
    return result


class TemplateViewSet(viewsets.ModelViewSet):
    queryset = Template.objects.all()
    serializer_class = TemplateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        obj = get_object_or_404(Template, pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_serializer_class(self):
        if self.action == "list":
            return TemplateListSerializer
        return TemplateSerializer

    def get_queryset(self):
        scope = self.request.query_params.get("scope", "all")

        # Базовая фильтрация по мягкому удалению
        base_qs = Template.objects.filter(is_deleted=False)

        if scope == "public":
            return base_qs.filter(visibility="PUBLIC").order_by("-updated_at")

        if scope == "my":
            return base_qs.filter(owner_id=CURRENT_USER_ID).order_by("-updated_at")

        if scope == "shared":
            all_templates = base_qs.exclude(owner_id=CURRENT_USER_ID)
            ids = [t.id for t in all_templates if CURRENT_USER_ID in (t.allowed_users or [])]
            return base_qs.filter(id__in=ids).order_by("-updated_at")

        all_templates = base_qs.all()
        ids = [
            t.id
            for t in all_templates
            if t.visibility == "PUBLIC" or t.owner_id == CURRENT_USER_ID or CURRENT_USER_ID in (t.allowed_users or [])
        ]
        return base_qs.filter(id__in=ids).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(owner_id=CURRENT_USER_ID)

    # perform_update/perform_create — дефолтные: сериализатор уже нормализует editor_content,
    # а Template.save() регенерирует html_content.

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_accessible_by(CURRENT_USER_ID):
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        old_html = instance.html_content
        old_editor = instance.editor_content
        old_docx = instance.docx_file.name if instance.docx_file else None

        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get("partial", False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        new_html = instance.html_content
        new_editor = instance.editor_content
        new_docx = instance.docx_file.name if instance.docx_file else None

        if old_html != new_html or old_docx != new_docx or old_editor != new_editor:
            version_count = instance.versions.count()
            TemplateVersion.objects.create(
                template=instance,
                version_number=version_count + 1,
                html_content=instance.html_content,
                editor_content=instance.editor_content,
                docx_file=instance.docx_file.name if instance.docx_file else None,
            )

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Проверка на владельца (даже для superuser, так как CURRENT_USER_ID
        # будет сравниваться с owner_id объекта)
        if instance.owner_id != CURRENT_USER_ID:
            return Response({"error": "Удаление разрешено только владельцу шаблона."}, status=status.HTTP_403_FORBIDDEN)

        # Мягкое удаление
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["GET"], url_path="download-source")
    def download_source(self, request, pk=None):
        """Скачать файл шаблона в указанном формате."""
        template = Template.objects.get(pk=pk)
        if not template.is_accessible_by(CURRENT_USER_ID):
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        # Параметр называется `fmt`, а не `format`, потому что `format` —
        # зарезервированное имя в DRF content-negotiation и ломает роутинг в 404.
        req_format = request.query_params.get("fmt", "").lower()
        if not req_format:
            req_format = template.template_type.lower()

        filename = _safe_filename(template.title)

        if req_format == "pdf":
            html = template.html_content or "<html><body><p>Empty Template</p></body></html>"
            try:
                pdf_bytes = PDFExportService.generate(html)
                response = HttpResponse(pdf_bytes, content_type="application/pdf")
                response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
                return response
            except Exception as e:
                logger.error(f"PDF source download failed: {e}", exc_info=True)
                return Response({"error": f"PDF generation failed: {str(e)}"}, status=500)

        elif req_format == "html":
            html = template.html_content or ""
            response = HttpResponse(html, content_type="text/html; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename}.html"'
            return response

        elif req_format == "json":
            export_data = {
                "template_id": template.id,
                "title": template.title,
                "template_type": template.template_type,
                "editor_content": template.editor_content or [],
                "html_content": template.html_content or "",
            }
            json_str = json.dumps(export_data, ensure_ascii=False, indent=2)

            response = HttpResponse(json_str, content_type="application/json; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename}.json"'
            return response

        elif req_format == "docx":
            try:
                docx_bytes = DocxBuilderService.build_from_json(template.editor_content)
                response = HttpResponse(
                    docx_bytes, content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
                response["Content-Disposition"] = f'attachment; filename="{filename}.docx"'
                return response
            except Exception as e:
                logger.error(f"DOCX source download failed: {e}", exc_info=True)
                return Response({"error": f"DOCX generation failed: {str(e)}"}, status=500)

        return Response({"error": f"Unknown format: {req_format}"}, status=400)

    @action(detail=True, methods=["post"])
    def render(self, request, pk=None):
        """Заполнение шаблона данными и отдача файла."""
        logger.info("=" * 50)
        logger.info(f"=== RENDER START === Template ID: {pk}")
        logger.info(f"Request data: {request.data}")

        try:
            template = self.get_object()
            logger.info(f"Template: {template.title}")
            logger.info(f"Template type: {template.template_type}")
            logger.info(f"Has docx_file: {bool(template.docx_file)}")
            logger.info(f"Has html_content: {bool(template.html_content)}")
            logger.info(f"html_content length: {len(template.html_content or '')}")

            if not template.is_accessible_by(CURRENT_USER_ID):
                logger.warning("Access denied")
                return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

            serializer = RenderSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=400)

            values = serializer.validated_data.get("values", {})
            logger.info(f"Values to render: {values}")

            return render_template(request, template, values)

        except Exception as e:
            logger.error(f"RENDER ERROR: {type(e).__name__}: {e}", exc_info=True)
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        template = self.get_object()
        if not template.is_accessible_by(CURRENT_USER_ID):
            return Response({"error": "Access denied."}, status=403)
        versions = template.versions.all()
        serializer = TemplateVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path=r"versions/restore/(?P<version_id>[^/.]+)")
    def restore_version(self, request, pk=None, version_id=None):
        template = self.get_object()
        if not template.is_accessible_by(CURRENT_USER_ID):
            return Response({"error": "Access denied."}, status=403)

        try:
            version = TemplateVersion.objects.get(id=version_id, template=template)
        except TemplateVersion.DoesNotExist:
            return Response({"error": "Version not found."}, status=404)

        version_count = template.versions.count()
        TemplateVersion.objects.create(
            template=template,
            version_number=version_count + 1,
            html_content=template.html_content,
            editor_content=template.editor_content,
            docx_file=template.docx_file.name if template.docx_file else None,
        )

        template.html_content = version.html_content
        template.editor_content = version.editor_content
        if version.docx_file:
            template.docx_file = version.docx_file

        template.save()
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="share-links")
    def create_share_link(self, request, pk=None):
        template = self.get_object()
        if not template.is_accessible_by(CURRENT_USER_ID):
            return Response({"error": "Access denied."}, status=403)

        ttl_days = request.data.get("ttl_days", 7)
        max_uses = request.data.get("max_uses", 50)

        share_link = ShareLink.objects.create(
            template=template,
            ttl_days=ttl_days,
            max_uses=max_uses,
        )
        serializer = ShareLinkSerializer(share_link)
        return Response(serializer.data, status=201)


def render_template(request, template: Template, values: dict[str, Any]):
    """Основная логика генерации документа с данными."""
    logger.info("=== render_template START ===")
    logger.info(f"Template: {template.title}, Type: {template.template_type}")

    # 1. Генерируем DOCX через DocxBuilderService (Spatial Sorting)
    if template.template_type == "DOCX":
        logger.info("Rendering DOCX template via DocxBuilderService...")
        try:
            docx_bytes = DocxBuilderService.build_from_json(template.editor_content, values)

            filename = _safe_filename(template.title) + ".docx"
            response = HttpResponse(
                docx_bytes,
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            logger.info(f"DOCX render successful: {filename}")
            return response
        except Exception as e:
            logger.error(f"DOCX Render failed: {e}", exc_info=True)
            return Response({"error": f"DOCX Render failed: {str(e)}"}, status=500)

    # 2. Генерируем PDF через PDFExportService (Playwright)
    logger.info("Rendering PDF via PDFExportService...")

    # Предпочитаем рендер из editor_content с подстановкой на уровне элементов —
    # плейсхолдеры не портятся об HTML-экранирование. Legacy-шаблоны без
    # editor_content падают в fallback-подстановку по готовому html_content.
    if template.editor_content:
        html_content = render_editor_content_html(template.editor_content, values)
    else:
        html_content = _apply_placeholders_html(template.html_content or "", values)

    try:
        pdf_bytes = PDFExportService.generate(html_content)
        filename = _safe_filename(template.title) + ".pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        logger.info(f"PDF render complete: {filename}")
        return response
    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        return Response(
            {"error": "Render failed.", "detail": str(e)},
            status=500,
        )


@api_view(["GET"])
def share_info(request, token):
    try:
        share_link = ShareLink.objects.get(token=token)
    except ShareLink.DoesNotExist:
        return Response({"error": "Share link not found."}, status=404)
    except Exception as e:
        logger.error(f"Error fetching share link: {e}")
        return Response({"error": "Internal server error."}, status=500)

    if not share_link.is_valid():
        return Response({"error": "Link expired or usage limit reached."}, status=403)

    template = share_link.template
    return Response(
        {
            "id": template.id,
            "title": template.title,
            "description": template.description,
            "template_type": template.template_type,
            "placeholders": template.get_placeholders(),
            "share_link": ShareLinkSerializer(share_link).data,
        }
    )


@api_view(["POST"])
def share_render(request, token):
    try:
        share_link = ShareLink.objects.get(token=token)
    except ShareLink.DoesNotExist:
        return Response({"error": "Link not found."}, status=404)
    except Exception as e:
        logger.error(f"Error fetching share link: {e}")
        return Response({"error": "Internal server error."}, status=500)

    if not share_link.is_valid():
        return Response({"error": "Link expired or usage limit reached."}, status=403)

    serializer = RenderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    values = serializer.validated_data.get("values", {})

    try:
        share_link.increment_use()
    except Exception as e:
        logger.error(f"Error incrementing share link usage: {e}")

    return render_template(request, share_link.template, values)
