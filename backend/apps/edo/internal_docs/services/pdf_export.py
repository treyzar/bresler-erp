"""PDF-экспорт документа: HTML-обёртка с шапкой/подвалом → Playwright → PDF.

Кеширование: результат пишется в `/media/edo_pdf_cache/<doc_id>/<hash>.pdf`
с TTL из `InternalDocFlowConfig.pdf_cache_ttl_hours`. Хэш зависит от
`(field_values, chain_snapshot, signature_images)` — любое изменение
инвалидирует кеш.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from pathlib import Path

from django.conf import settings
from django.template import Context, Template

from apps.edo.templates_app.services.pdf_export import PDFExportService

from ..models import Document, InternalDocFlowConfig

logger = logging.getLogger(__name__)


PDF_LAYOUT_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; }
  .edo-header { display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 24px; font-size: 11pt; }
  .edo-header .from { max-width: 45%; }
  .edo-header .to { max-width: 45%; text-align: right; }
  .edo-title { text-align: center; font-weight: bold; font-size: 14pt; margin: 24px 0 16px; }
  .edo-number { text-align: center; font-size: 10pt; color: #555; margin-bottom: 24px; }
  .edo-body { line-height: 1.5; }
  .edo-body p { margin: 0 0 10px; }
  .edo-footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .edo-signature { min-width: 200px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
  .edo-signature img { max-height: 60px; margin-bottom: 4px; display: block; margin-left: auto; margin-right: auto; }
</style>
</head>
<body>
  <div class="edo-header">
    <div class="from">
      {% if company_name %}{{ company_name }}<br>{% endif %}
      {{ from_position }}<br>
      {{ from_name }}
    </div>
    <div class="to">
      {% if to_person %}
        {{ to_person_position }}<br>{{ to_person_name }}
      {% endif %}
      {% if to_department %}
        Подразделение:<br>{{ to_department }}
      {% endif %}
    </div>
  </div>

  <div class="edo-title">{{ title }}</div>
  {% if number %}<div class="edo-number">№ {{ number }} от {{ date }}</div>{% endif %}

  <div class="edo-body">{{ body_html|safe }}</div>

  <div class="edo-footer">
    <div>
      {{ date }}
    </div>
    <div class="edo-signature">
      {% if signature_image %}<img src="{{ signature_image }}" alt="signature">{% endif %}
      {{ from_name }}
    </div>
  </div>
</body>
</html>
"""


def _cache_root() -> Path:
    root = Path(getattr(settings, "MEDIA_ROOT", "/tmp")) / "edo_pdf_cache"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _compute_hash(document: Document) -> str:
    """Hash зависит от всего, что влияет на финальный PDF."""
    signatures = list(document.steps.values_list("signature_image", flat=True))
    payload = {
        "field_values": document.field_values,
        "chain_snapshot": document.chain_snapshot,
        "body": document.body_rendered,
        "title": document.title,
        "number": document.number,
        "signatures": signatures,
        "status": document.status,
    }
    raw = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def _cache_path(document: Document, hash_: str) -> Path:
    return _cache_root() / str(document.pk) / f"{hash_}.pdf"


def _prune_expired_cache(document: Document, ttl_hours: int) -> None:
    """Удаляет старые PDF-кеши этого документа, если превышен TTL."""
    doc_dir = _cache_root() / str(document.pk)
    if not doc_dir.exists():
        return
    ttl_seconds = ttl_hours * 3600
    now = time.time()
    for p in doc_dir.iterdir():
        if p.is_file() and (now - p.stat().st_mtime) > ttl_seconds:
            try:
                p.unlink()
            except OSError:
                pass


def _build_html(document: Document) -> str:
    """Собирает HTML документа с шапкой/подвалом."""
    author = document.author
    header = document.header_snapshot or {}

    # «Кому» — зависит от типа документа
    to_person_name = ""
    to_person_position = ""
    to_department = ""
    if document.addressee_id:
        to_person_name = document.addressee.get_full_name()
        to_person_position = document.addressee.position or ""
    elif "addressee_department" in (document.field_values or {}):
        from apps.directory.models import Department
        dept = Department.objects.filter(pk=document.field_values["addressee_department"]).first()
        if dept:
            to_department = dept.name

    # Первая подпись (первый approved step с signature_image) — для оформления в подвале.
    signature_image = ""
    signed_step = document.steps.filter(status="approved").exclude(signature_image="").first()
    if signed_step:
        signature_image = signed_step.signature_image

    ctx = {
        "company_name": header.get("company_name", "") or (author.company or ""),
        "from_position": author.position or "",
        "from_name": author.get_full_name() or author.username,
        "to_person": bool(document.addressee_id),
        "to_person_name": to_person_name,
        "to_person_position": to_person_position,
        "to_department": to_department,
        "title": document.title or document.type.name,
        "number": document.number or "",
        "date": (document.submitted_at or document.created_at).strftime("%d.%m.%Y"),
        "body_html": document.body_rendered or "",
        "signature_image": signature_image,
    }

    tpl = Template(PDF_LAYOUT_TEMPLATE)
    return tpl.render(Context(ctx))


def export_pdf(document: Document) -> bytes:
    """Возвращает PDF-байты. Использует on-disk кеш с TTL."""
    config = InternalDocFlowConfig.get_solo()
    ttl = max(1, config.pdf_cache_ttl_hours)

    hash_ = _compute_hash(document)
    path = _cache_path(document, hash_)

    _prune_expired_cache(document, ttl)

    if path.exists() and (time.time() - path.stat().st_mtime) < ttl * 3600:
        logger.info("PDF cache hit: doc=%s hash=%s", document.pk, hash_)
        return path.read_bytes()

    logger.info("PDF cache miss: doc=%s hash=%s — rendering", document.pk, hash_)
    html = _build_html(document)
    pdf_bytes = PDFExportService.generate(html)

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pdf_bytes)
    return pdf_bytes
