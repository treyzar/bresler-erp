"""Celery tasks for core app — async event handler dispatch."""

import importlib
import logging

from celery import shared_task

logger = logging.getLogger("core.events")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_event_handler(self, handler_path: str, kwargs: dict):
    """
    Execute an event handler asynchronously via Celery.

    Args:
        handler_path: Dotted path to the handler function (e.g., "apps.notifications.handlers.on_order_created").
        kwargs: Serialized event kwargs (model instances stored as {_model, _pk}).
    """
    from apps.core.events import _deserialize_kwargs

    event_name = kwargs.pop("_event_name", "unknown")

    try:
        # Import handler function from dotted path
        module_path, func_name = handler_path.rsplit(".", 1)
        module = importlib.import_module(module_path)
        handler = getattr(module, func_name)

        # Deserialize model instances
        deserialized = _deserialize_kwargs(kwargs)

        logger.info("Async handler %s for event '%s'", handler_path, event_name)
        handler(event_name=event_name, **deserialized)

    except Exception as exc:
        logger.exception(
            "Error in async handler %s for event '%s'",
            handler_path,
            event_name,
        )
        raise self.retry(exc=exc)
