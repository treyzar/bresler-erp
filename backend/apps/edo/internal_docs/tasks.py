"""Celery tasks для внутреннего документооборота."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def cleanup_pdf_cache():
    """Удаляет PDF-кеши старше `InternalDocFlowConfig.pdf_cache_ttl_hours`.

    Запускается ежедневно Celery Beat'ом. Точечная чистка в `export_pdf`
    срабатывает только когда документ переоткрывают; этот task убирает
    «забытые» документы, которые никто больше не открывает.
    """
    from .services.pdf_export import prune_all_expired_cache

    stats = prune_all_expired_cache()
    logger.info("cleanup_pdf_cache: %s", stats)
    return stats


@shared_task
def check_sla_breaches():
    """Сканирует pending-шаги с истёкшим SLA и помечает их sla_breached_at.

    Запускается каждый час (CELERY_BEAT_SCHEDULE). Идемпотентно: один и тот же
    шаг помечается только один раз — повторных уведомлений не будет.
    """
    from .services.sla import mark_sla_breaches

    n = mark_sla_breaches()
    logger.info("check_sla_breaches: %s breaches", n)
    return {"breaches_marked": n}
