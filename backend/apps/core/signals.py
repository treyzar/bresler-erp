"""
Auto-event generation from Django signals.

Listens to post_save and post_delete on registered models and automatically
triggers events like "order.created", "order.updated", "order.deleted".

Inspired by InvenTree's auto-event system.
"""

import logging

from django.db.models.signals import post_delete, post_save

from apps.core.events import trigger_event

logger = logging.getLogger("core.events")

# Models that should NOT generate auto-events (framework/auth tables)
_EXCLUDED_LABELS = {
    "auth.Permission",
    "auth.Group",
    "contenttypes.ContentType",
    "sessions.Session",
    "admin.LogEntry",
    "token_blacklist.OutstandingToken",
    "token_blacklist.BlacklistedToken",
    "simple_history.HistoricalRecords",
}

# Models explicitly registered for auto-events
_auto_event_models: set[str] = set()


def register_auto_events(*model_classes) -> None:
    """
    Register models for automatic event generation.

    Call this in AppConfig.ready() for models that should emit events:
        register_auto_events(Order, Contract, OrgUnit)

    This will auto-generate events:
        - {app}.{model}.created  (post_save, created=True)
        - {app}.{model}.updated  (post_save, created=False)
        - {app}.{model}.deleted  (post_delete)

    Event names use lowercase, e.g.: "order.created", "contract.updated".
    """
    for model_class in model_classes:
        label = model_class._meta.label
        if label in _EXCLUDED_LABELS:
            continue

        if label in _auto_event_models:
            continue

        _auto_event_models.add(label)

        post_save.connect(_on_post_save, sender=model_class, weak=False)
        post_delete.connect(_on_post_delete, sender=model_class, weak=False)

        logger.debug("Registered auto-events for %s", label)


def _get_event_prefix(instance) -> str:
    """Get event prefix from model, e.g. 'order', 'contract', 'orgunit'."""
    return instance._meta.model_name


def _on_post_save(sender, instance, created, **kwargs):
    """Auto-trigger 'created' or 'updated' event on post_save."""
    prefix = _get_event_prefix(instance)
    event_name = f"{prefix}.created" if created else f"{prefix}.updated"
    trigger_event(event_name, instance=instance)


def _on_post_delete(sender, instance, **kwargs):
    """Auto-trigger 'deleted' event on post_delete."""
    prefix = _get_event_prefix(instance)
    trigger_event(f"{prefix}.deleted", instance=instance)
