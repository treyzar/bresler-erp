"""Тесты ZIP-архива EDO-документов: services.zip_archive + endpoint."""

from __future__ import annotations

import io
import json
import zipfile
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    Document,
    DocumentType,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.edo.internal_docs.services.zip_archive import build_archive
from apps.users.tests.factories import UserFactory


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept = Department.add_root(name="Отдел", unit_type="department", company=company)
    return {"company": company, "dept": dept}


@pytest.fixture
def author(org):
    return UserFactory(last_name="Иванов", company_unit=org["company"], department_unit=org["dept"])


@pytest.fixture
def supervisor(org):
    return UserFactory(
        last_name="Петров", company_unit=org["company"], department_unit=org["dept"],
        is_department_head=True,
    )


@pytest.fixture
def admin_user(db):
    g, _ = Group.objects.get_or_create(name="admin")
    u = UserFactory(last_name="Адм")
    u.groups.add(g)
    return u


@pytest.fixture
def memo_type(db):
    seq = NumberSequence.objects.create(name="zip", prefix="Z", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="zip-chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"}],
    )
    return DocumentType.objects.create(
        code="zip_memo", name="Zip memo", category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}", body_template="{{ subject }}",
        default_chain=chain, numbering_sequence=seq,
    )


def _make_pending_doc(memo_type, author, idx=0):
    doc = svc.create_draft(author=author, doc_type=memo_type, field_values={"subject": f"x{idx}"})
    svc.submit(doc, author)
    return doc


# ============== build_archive ==============


@pytest.mark.django_db
def test_archive_includes_index_and_metadata(memo_type, author, supervisor):
    """Архив всегда содержит index.json и metadata.json в папке каждого документа."""
    doc = _make_pending_doc(memo_type, author)
    today = timezone.localdate()

    with patch("apps.edo.internal_docs.services.zip_archive.export_pdf",
               return_value=b"fake-pdf-bytes"):
        data, summary = build_archive(today - timedelta(days=1), today + timedelta(days=1))

    assert summary["total"] == 1
    assert summary["pdf_ok"] == 1
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        assert "index.json" in names
        # Метаданные внутри папки документа.
        meta_paths = [n for n in names if n.endswith("/metadata.json")]
        assert len(meta_paths) == 1
        meta = json.loads(zf.read(meta_paths[0]))
        assert meta["id"] == doc.pk
        assert meta["number"] == doc.number
        # PDF замоканный.
        pdf_paths = [n for n in names if n.endswith("/document.pdf")]
        assert len(pdf_paths) == 1
        assert zf.read(pdf_paths[0]) == b"fake-pdf-bytes"


@pytest.mark.django_db
def test_archive_filters_by_date(memo_type, author, supervisor):
    """Документы вне диапазона дат не попадают в архив."""
    today = timezone.localdate()
    doc = _make_pending_doc(memo_type, author)
    # Сдвигаем submitted_at в прошлое.
    Document.objects.filter(pk=doc.pk).update(
        submitted_at=timezone.now() - timedelta(days=60),
    )

    with patch("apps.edo.internal_docs.services.zip_archive.export_pdf", return_value=b"x"):
        # Запрос за последние 7 дней — документ не должен попасть.
        _data, summary = build_archive(today - timedelta(days=7), today)

    assert summary["total"] == 0


@pytest.mark.django_db
def test_archive_filters_by_status(memo_type, author, supervisor):
    today = timezone.localdate()
    doc1 = _make_pending_doc(memo_type, author, idx=1)
    doc2 = _make_pending_doc(memo_type, author, idx=2)
    svc.approve(doc1, supervisor, comment="ok")  # approved

    with patch("apps.edo.internal_docs.services.zip_archive.export_pdf", return_value=b"x"):
        _data, summary = build_archive(
            today - timedelta(days=1), today + timedelta(days=1),
            status_filter=["approved"],
        )

    assert summary["total"] == 1


@pytest.mark.django_db
def test_archive_handles_pdf_failure(memo_type, author, supervisor):
    """Если PDF не сгенерировался — счётчик `pdf_failed` инкрементится, архив всё равно собирается."""
    today = timezone.localdate()
    _make_pending_doc(memo_type, author)

    with patch("apps.edo.internal_docs.services.zip_archive.export_pdf",
               side_effect=RuntimeError("playwright down")):
        data, summary = build_archive(today - timedelta(days=1), today + timedelta(days=1))

    assert summary["pdf_failed"] == 1
    # Метаданные всё равно записаны.
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        assert any(n.endswith("/metadata.json") for n in zf.namelist())


# ============== /admin/export-archive-zip/ ==============


@pytest.mark.django_db
def test_zip_endpoint_admin_only(memo_type, author):
    client = APIClient()
    client.force_authenticate(author)
    today = timezone.localdate()
    r = client.get(f"/api/edo/internal/admin/export-archive-zip/?from={today}&to={today}")
    assert r.status_code == 403


@pytest.mark.django_db
def test_zip_endpoint_returns_zip(memo_type, author, supervisor, admin_user):
    today = timezone.localdate()
    _make_pending_doc(memo_type, author)
    client = APIClient()
    client.force_authenticate(admin_user)
    with patch("apps.edo.internal_docs.services.zip_archive.export_pdf", return_value=b"pdf"):
        r = client.get(
            "/api/edo/internal/admin/export-archive-zip/",
            data={"from": str(today - timedelta(days=1)), "to": str(today + timedelta(days=1))},
        )
    assert r.status_code == 200
    assert r["Content-Type"] == "application/zip"
    assert "X-Archive-Summary" in r
    # Корректный ZIP.
    zf = zipfile.ZipFile(io.BytesIO(b"".join(r.streaming_content) if r.streaming else r.content))
    assert "index.json" in zf.namelist()


@pytest.mark.django_db
def test_zip_endpoint_validates_dates(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.get("/api/edo/internal/admin/export-archive-zip/?from=bogus&to=2026-01-01")
    assert r.status_code == 400
    r = client.get("/api/edo/internal/admin/export-archive-zip/?from=2026-12-01&to=2026-01-01")
    assert r.status_code == 400  # from > to
