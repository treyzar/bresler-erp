"""
Notification service — create and send notifications to users.
"""

import logging

from django.contrib.contenttypes.models import ContentType

from apps.notifications.models import Notification, NotificationEntry

logger = logging.getLogger("notifications")


def create_notification(
    recipients,
    title: str,
    message: str = "",
    category: str = Notification.Category.INFO,
    target=None,
    link: str = "",
    deduplicate_key: str = "",
    deduplicate_hours: int = 24,
) -> list[Notification]:
    """
    Create notifications for one or more recipients.

    Args:
        recipients: User queryset, list of Users, or single User.
        title: Notification title.
        message: Notification body (max 500 chars).
        category: info / success / warning / error.
        target: Django model instance to link to (optional).
        link: Frontend URL path (optional, auto-generated from target if empty).
        deduplicate_key: If set, prevents duplicate notifications within deduplicate_hours.
        deduplicate_hours: Deduplication window in hours.

    Returns:
        List of created Notification instances.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    # Normalize recipients to a list of user instances
    if isinstance(recipients, User):
        recipients = [recipients]
    elif hasattr(recipients, "all"):
        recipients = list(recipients.all())

    if not recipients:
        return []

    # Resolve target content type
    target_type = None
    target_id = None
    if target is not None:
        target_type = ContentType.objects.get_for_model(target)
        target_id = target.pk

    # Auto-generate link from target if not provided
    if not link and target is not None:
        link = _build_link(target)

    created = []
    for user in recipients:
        if not user.is_active:
            continue

        # Deduplication check
        if deduplicate_key and target_id:
            if NotificationEntry.check_recent(
                deduplicate_key, target_id, user.pk, deduplicate_hours
            ):
                logger.debug(
                    "Skipping duplicate notification '%s' for user %s",
                    deduplicate_key,
                    user.pk,
                )
                continue

        notification = Notification.objects.create(
            recipient=user,
            title=title,
            message=message,
            category=category,
            target_type=target_type,
            target_id=target_id,
            link=link,
        )
        created.append(notification)

        # Record deduplication entry
        if deduplicate_key and target_id:
            NotificationEntry.notify(deduplicate_key, target_id, user.pk)

        # Send real-time via WebSocket
        _send_websocket(notification)

    logger.info(
        "Created %d notification(s): '%s' → %d recipient(s)",
        len(created),
        title,
        len(recipients),
    )
    return created


def get_unread_count(user) -> int:
    """Get unread notification count for a user."""
    return Notification.objects.filter(recipient=user, is_read=False).count()


def mark_read(notification_id: int, user) -> bool:
    """Mark a single notification as read."""
    return Notification.objects.filter(
        pk=notification_id, recipient=user, is_read=False
    ).update(is_read=True) > 0


def mark_all_read(user) -> int:
    """Mark all notifications as read for a user. Returns count."""
    return Notification.objects.filter(
        recipient=user, is_read=False
    ).update(is_read=True)


def _build_link(target) -> str:
    """Auto-generate frontend URL from a model instance."""
    model_name = target._meta.model_name

    if model_name == "order":
        return f"/orders/{target.order_number}"
    elif model_name == "contract":
        return f"/orders/{target.order.order_number}"
    elif model_name == "orgunit":
        return f"/directory/orgunits"
    elif model_name == "letter":
        return f"/edo/registry/{target.pk}"

    return ""


def _send_websocket(notification: Notification) -> None:
    """Push notification to user via WebSocket (async-safe)."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = f"notifications_{notification.recipient_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.new",
                "notification": {
                    "id": notification.pk,
                    "title": notification.title,
                    "message": notification.message,
                    "category": notification.category,
                    "link": notification.link,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )
    except Exception:
        logger.debug("WebSocket send failed (channel layer may not be available)")
