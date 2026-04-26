"""ZIP-экспорт архива EDO-документов за период.

Использование:
    bytes_iter = build_archive(date_from, date_to, status_filter=None)

Внутри архива каждый документ — отдельная папка `{number}/`, содержащая:
- `document.pdf`     — PDF-рендер (через существующий pdf_export.export_pdf)
- `metadata.json`    — поля + цепочка + статусы шагов
- `attachments/`     — оригинальные файлы вложений (если есть)

Реализация — потоковая, через `zipfile.ZipFile` поверх `BytesIO`. Для
архивов > ~100 МБ имеет смысл сменить на streaming response с
`zipstream-ng`, но в типичных кейсах (≤ 1k документов) этого хватает.
"""

from __future__ import annotations

import io
import json
import logging
import zipfile
from datetime import date, datetime
from typing import Iterable

from django.utils import timezone

from ..models import Document
from .pdf_export import export_pdf

logger = logging.getLogger(__name__)


def _safe_filename(name: str) -> str:
    """Приводит произвольную строку к виду, безопасному для Windows/Linux."""
    bad = '<>:"/\\|?*\0'
    return "".join(c if c not in bad else "_" for c in name).strip().rstrip(".") or "doc"


def _serialize_document(doc: Document) -> dict:
    """Метаданные документа для metadata.json."""
    return {
        "id": doc.pk,
        "number": doc.number,
        "title": doc.title,
        "type_code": doc.type.code if doc.type_id else "",
        "type_name": doc.type.name if doc.type_id else "",
        "author": doc.author.get_full_name() if doc.author_id else "",
        "status": doc.status,
        "submitted_at": doc.submitted_at.isoformat() if doc.submitted_at else None,
        "closed_at": doc.closed_at.isoformat() if doc.closed_at else None,
        "field_values": doc.field_values,
        "header_snapshot": doc.header_snapshot,
        "chain_snapshot": doc.chain_snapshot,
        "steps": [
            {
                "order": s.order,
                "role_label": s.role_label,
                "action": s.action,
                "status": s.status,
                "approver": s.approver.get_full_name() if s.approver_id else "",
                "decided_at": s.decided_at.isoformat() if s.decided_at else None,
                "comment": s.comment,
            }
            for s in doc.steps.all().order_by("order")
        ],
    }


def _filter_documents(
    date_from: date,
    date_to: date,
    status_filter: list[str] | None = None,
):
    """Документы, у которых `submitted_at` или `closed_at` попадает в диапазон."""
    from django.db.models import Q
    qs = (
        Document.objects
        .select_related("type", "author")
        .prefetch_related("steps", "steps__approver", "attachments")
    )
    # Берём документы, у которых submitted_at∈[from, to] ИЛИ closed_at∈[from, to].
    start = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.get_current_timezone())
    end = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.get_current_timezone())
    qs = qs.filter(
        Q(submitted_at__range=(start, end)) | Q(closed_at__range=(start, end))
    )
    if status_filter:
        qs = qs.filter(status__in=status_filter)
    return qs.order_by("submitted_at")


def build_archive(
    date_from: date,
    date_to: date,
    status_filter: list[str] | None = None,
    *,
    include_pdf: bool = True,
    include_attachments: bool = True,
) -> tuple[bytes, dict]:
    """Собирает ZIP в память. Возвращает (bytes, summary).

    `summary` — словарь со счётчиками для логирования и UI-уведомления.
    """
    docs = list(_filter_documents(date_from, date_to, status_filter))
    summary = {
        "total": len(docs),
        "pdf_ok": 0,
        "pdf_failed": 0,
        "attachments_total": 0,
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Index — сводный JSON: список документов.
        zf.writestr(
            "index.json",
            json.dumps(
                {
                    "exported_at": timezone.now().isoformat(),
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "status_filter": status_filter or [],
                    "documents": [
                        {"id": d.pk, "number": d.number, "title": d.title, "status": d.status}
                        for d in docs
                    ],
                },
                ensure_ascii=False,
                indent=2,
            ),
        )

        for doc in docs:
            folder = _safe_filename(doc.number or f"draft_{doc.pk}")
            # 1) metadata.json
            zf.writestr(f"{folder}/metadata.json",
                        json.dumps(_serialize_document(doc), ensure_ascii=False, indent=2))
            # 2) PDF
            if include_pdf and doc.body_rendered:
                try:
                    pdf_bytes = export_pdf(doc)
                    zf.writestr(f"{folder}/document.pdf", pdf_bytes)
                    summary["pdf_ok"] += 1
                except Exception:
                    logger.exception("Failed to render PDF for doc %s", doc.pk)
                    summary["pdf_failed"] += 1
            # 3) Вложения
            if include_attachments:
                for att in doc.attachments.all():
                    if not att.file:
                        continue
                    try:
                        with att.file.open("rb") as fp:
                            data = fp.read()
                        zf.writestr(
                            f"{folder}/attachments/{_safe_filename(att.file_name)}",
                            data,
                        )
                        summary["attachments_total"] += 1
                    except Exception:
                        logger.exception("Failed to bundle attachment %s", att.pk)

    return buf.getvalue(), summary


def stream_archive(
    date_from: date,
    date_to: date,
    status_filter: list[str] | None = None,
) -> Iterable[bytes]:
    """Backwards-compat: один блок (для совместимости со streaming).
    Сейчас фактически не стримится — возвращает буфер целиком."""
    data, _ = build_archive(date_from, date_to, status_filter)
    yield data
