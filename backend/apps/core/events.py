"""
Event System for Bresler ERP.

Inspired by InvenTree's event architecture. Provides a central event bus
that decouples event producers (services, signals) from consumers
(notifications, audit log, webhooks).

Usage:
    # Register a handler:
    @on_event("order.created")
    def notify_managers(instance, user=None, **kwargs):
        ...

    # Trigger an event:
    trigger_event("order.created", instance=order, user=request.user)

    # Trigger async (via Celery):
    trigger_event("order.created", instance=order, async_handlers=True)
"""

import logging
from collections import defaultdict
from functools import wraps
from typing import Any

logger = logging.getLogger("core.events")

# Global registry: event_name -> list of handler callables
_registry: dict[str, list[dict[str, Any]]] = defaultdict(list)

# Flag to suppress events during bulk operations (import, migration, etc.)
_events_suppressed = False


def on_event(*event_names: str, async_task: bool = False):
    """
    Decorator to register an event handler.

    Args:
        event_names: One or more event names to handle (e.g., "order.created").
        async_task: If True, handler will be dispatched via Celery.

    Example:
        @on_event("order.created", "order.status_changed")
        def handle_order_event(event_name, instance, **kwargs):
            ...
    """

    def decorator(func):
        for event_name in event_names:
            _registry[event_name].append({
                "handler": func,
                "async_task": async_task,
                "module": func.__module__,
                "name": func.__qualname__,
            })
            logger.debug(
                "Registered handler %s.%s for event '%s'",
                func.__module__,
                func.__qualname__,
                event_name,
            )

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return decorator


def trigger_event(event_name: str, **kwargs) -> None:
    """
    Trigger an event, calling all registered handlers.

    Args:
        event_name: Event name (e.g., "order.created", "order.status_changed").
        **kwargs: Event data passed to handlers (instance, user, old_value, etc.).
    """
    if _events_suppressed:
        logger.debug("Events suppressed, skipping '%s'", event_name)
        return

    handlers = _registry.get(event_name, [])
    if not handlers:
        logger.debug("No handlers for event '%s'", event_name)
        return

    logger.info(
        "Triggering event '%s' → %d handler(s)",
        event_name,
        len(handlers),
    )

    for entry in handlers:
        handler = entry["handler"]
        try:
            if entry["async_task"]:
                _dispatch_async(event_name, handler, kwargs)
            else:
                handler(event_name=event_name, **kwargs)
        except Exception:
            logger.exception(
                "Error in handler %s.%s for event '%s'",
                entry["module"],
                entry["name"],
                event_name,
            )


def _dispatch_async(event_name: str, handler, kwargs: dict) -> None:
    """Dispatch handler via Celery task."""
    from apps.core.tasks import run_event_handler

    # Serialize: pass dotted path to handler + serializable kwargs
    handler_path = f"{handler.__module__}.{handler.__qualname__}"

    # Extract serializable data from kwargs
    serializable_kwargs = _make_serializable(kwargs)
    serializable_kwargs["_event_name"] = event_name

    run_event_handler.delay(handler_path, serializable_kwargs)


def _make_serializable(kwargs: dict) -> dict:
    """Convert kwargs to JSON-serializable format for Celery."""
    result = {}
    for key, value in kwargs.items():
        if hasattr(value, "pk"):
            # Django model instance → store as {model_label, pk}
            result[key] = {
                "_model": value._meta.label,
                "_pk": value.pk,
            }
        elif isinstance(value, (str, int, float, bool, type(None), list, dict)):
            result[key] = value
        else:
            result[key] = str(value)
    return result


def _deserialize_kwargs(kwargs: dict) -> dict:
    """Restore Django model instances from serialized kwargs."""
    from django.apps import apps

    result = {}
    for key, value in kwargs.items():
        if isinstance(value, dict) and "_model" in value and "_pk" in value:
            model_class = apps.get_model(value["_model"])
            try:
                result[key] = model_class.objects.get(pk=value["_pk"])
            except model_class.DoesNotExist:
                logger.warning(
                    "Model instance %s(pk=%s) not found during deserialization",
                    value["_model"],
                    value["_pk"],
                )
                result[key] = None
        else:
            result[key] = value
    return result


class suppress_events:
    """
    Context manager / decorator to suppress events during bulk operations.

    Usage:
        with suppress_events():
            # No events will fire during import
            for row in data:
                Order.objects.create(...)

        @suppress_events()
        def bulk_import_task():
            ...
    """

    def __enter__(self):
        global _events_suppressed
        self._was_suppressed = _events_suppressed
        _events_suppressed = True
        return self

    def __exit__(self, *args):
        global _events_suppressed
        _events_suppressed = self._was_suppressed

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with self:
                return func(*args, **kwargs)

        return wrapper


def get_registered_events() -> dict[str, list[str]]:
    """Return a dict of event_name -> list of handler names (for debugging)."""
    return {
        event_name: [f"{e['module']}.{e['name']}" for e in entries]
        for event_name, entries in _registry.items()
    }


def clear_registry() -> None:
    """Clear all registered handlers (for testing)."""
    _registry.clear()
