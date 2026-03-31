"""Celery tasks for async import processing."""

import logging

from celery import shared_task

logger = logging.getLogger("importer")


@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def process_import(self, session_id: int):
    """Process an import session asynchronously."""
    from apps.importer.models import ImportSession
    from apps.importer.services import apply_import

    try:
        session = ImportSession.objects.get(pk=session_id)
        result = apply_import(session)
        logger.info("Import session %d completed: %s", session_id, result)
        return result
    except ImportSession.DoesNotExist:
        logger.error("Import session %d not found", session_id)
        return {"error": "session_not_found"}
    except Exception as exc:
        logger.exception("Import session %d failed", session_id)
        try:
            session = ImportSession.objects.get(pk=session_id)
            session.status = ImportSession.Status.ERROR
            session.error_details = [{"row": 0, "field": "", "message": str(exc)[:500]}]
            session.save(update_fields=["status", "error_details"])
        except Exception:
            pass
        raise self.retry(exc=exc)
