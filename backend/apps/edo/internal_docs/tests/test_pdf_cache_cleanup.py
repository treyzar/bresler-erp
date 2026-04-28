"""Тесты глобальной чистки PDF-кеша (services.pdf_export.prune_all_expired_cache)."""

import os
import time
from pathlib import Path

import pytest

from apps.edo.internal_docs.services.pdf_export import prune_all_expired_cache


@pytest.fixture
def cache_root(tmp_path, settings):
    """Подменяем MEDIA_ROOT, чтобы кеш писался во временную папку."""
    settings.MEDIA_ROOT = str(tmp_path)
    return Path(tmp_path) / "edo_pdf_cache"


def _write_cached_pdf(cache_root: Path, doc_id: int, hash_: str, age_hours: float) -> Path:
    doc_dir = cache_root / str(doc_id)
    doc_dir.mkdir(parents=True, exist_ok=True)
    p = doc_dir / f"{hash_}.pdf"
    p.write_bytes(b"%PDF-1.4 fake")
    mtime = time.time() - age_hours * 3600
    os.utime(p, (mtime, mtime))
    return p


def test_removes_only_expired(cache_root: Path):
    fresh = _write_cached_pdf(cache_root, 1, "aaa", age_hours=1)
    expired = _write_cached_pdf(cache_root, 2, "bbb", age_hours=200)

    stats = prune_all_expired_cache(ttl_hours=168)  # 7 дней

    assert fresh.exists()
    assert not expired.exists()
    assert stats["files_removed"] == 1
    assert stats["bytes_freed"] > 0


def test_removes_empty_doc_dirs(cache_root: Path):
    p = _write_cached_pdf(cache_root, 42, "xxx", age_hours=1000)
    doc_dir = p.parent

    prune_all_expired_cache(ttl_hours=24)

    assert not doc_dir.exists()


def test_keeps_doc_dir_with_remaining_files(cache_root: Path):
    expired = _write_cached_pdf(cache_root, 7, "old", age_hours=500)
    fresh = _write_cached_pdf(cache_root, 7, "new", age_hours=2)

    prune_all_expired_cache(ttl_hours=72)

    assert not expired.exists()
    assert fresh.exists()
    assert fresh.parent.exists()


def test_empty_cache_does_not_crash(cache_root: Path):
    stats = prune_all_expired_cache(ttl_hours=24)
    assert stats["files_removed"] == 0
    assert stats["dirs_removed"] == 0
