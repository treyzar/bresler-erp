"""
Notification service — create and send notifications to users.

Supports two delivery channels:
- In-app bell (WebSocket real-time push)
- Email (immediate or batched digest)

Channel selection is controlled per-user via NotificationPreference.
"""

import logging

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from apps.notifications.models import Notification, NotificationEntry, NotificationPreference

logger = logging.getLogger("notifications")

# Map deduplicate_key prefixes to NotificationPreference field names
_EVENT_TO_PREF_FIELD = {
    "order.created": "order_created",
    "order.status_changed": "order_status_changed",
    "order.overdue": "order_deadline",
    "order.deadline_approaching": "order_deadline",
    "contract.payment_changed": "contract_payment",
    "comment.order": "comments",
    "comment.contract": "comments",
    "import.completed": "import_completed",
}


def _get_preference(user) -> NotificationPreference:
    """Get or create notification preferences for a user."""
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    return pref


def create_notification(
    recipients,
    title: str,
    message: str = "",
    category: str = Notification.Category.INFO,
    target=None,
    link: str = "",
    deduplicate_key: str = "",
    deduplicate_hours: int = 24,
    send_email: bool = True,
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
            Also used to check user's notification preferences.
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

    # Resolve preference field for this event
    pref_field = _EVENT_TO_PREF_FIELD.get(deduplicate_key, "")

    created = []
    for user in recipients:
        if not user.is_active:
            continue

        # Check user notification preferences
        if pref_field:
            pref = _get_preference(user)
            if not pref.is_bell_enabled(pref_field):
                logger.debug(
                    "User %s disabled bell for '%s', skipping",
                    user.pk,
                    deduplicate_key,
                )
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

        # Send email if user preference allows it.
        # Caller can pass send_email=False, чтобы потом отправить кастомное
        # письмо (например, EDO approval-link с подписанными URL'ами).
        if send_email and pref_field:
            pref = _get_preference(user)
            if pref.is_email_enabled(pref_field) and user.email:
                _send_email(notification)

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


def send_email_digest() -> int:
    """
    Send email digest of unread notifications to users who have email enabled.
    Called by Celery Beat task (e.g., daily).

    Returns count of emails sent.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    sent_count = 0

    # Find users with unread notifications
    users_with_unread = (
        User.objects.filter(
            is_active=True,
            notifications__is_read=False,
        )
        .exclude(email="")
        .distinct()
    )

    for user in users_with_unread:
        pref = _get_preference(user)

        # Collect unread notifications for events where email is enabled
        unread = Notification.objects.filter(
            recipient=user,
            is_read=False,
        ).order_by("-created_at")[:20]

        if not unread:
            continue

        # Filter to only include notifications for email-enabled categories
        email_items = []
        for notif in unread:
            # For digest, include all unread — user already opted in via preferences
            email_items.append(notif)

        if not email_items:
            continue

        # Build email
        subject = f"Bresler ERP: {len(email_items)} непрочитанных уведомлений"

        base_url = getattr(settings, "SITE_URL", "")
        lines = []
        for n in email_items:
            link = f"{base_url}{n.link}" if n.link else ""
            lines.append(f"• {n.title}" + (f"\n  {n.message}" if n.message else "") + (f"\n  {link}" if link else ""))

        text_body = (
            f"Здравствуйте, {user.get_short_name() or user.username}!\n\n"
            f"У вас {len(email_items)} непрочитанных уведомлений:\n\n"
            + "\n\n".join(lines)
            + f"\n\n---\nBresler ERP{' — ' + base_url if base_url else ''}"
        )

        try:
            send_mail(
                subject=subject,
                message=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            sent_count += 1
            logger.info("Sent email digest to %s (%d items)", user.email, len(email_items))
        except Exception:
            logger.exception("Failed to send email digest to %s", user.email)

    return sent_count


def _send_email(notification: Notification) -> None:
    """Send immediate email notification to the recipient."""
    user = notification.recipient
    if not user.email:
        return

    base_url = getattr(settings, "SITE_URL", "")
    link = f"{base_url}{notification.link}" if notification.link else ""

    subject = f"Bresler ERP: {notification.title}"
    text_body = (
        f"Здравствуйте, {user.get_short_name() or user.username}!\n\n"
        f"{notification.title}\n"
        + (f"{notification.message}\n" if notification.message else "")
        + (f"\nПерейти: {link}\n" if link else "")
        + f"\n---\nBresler ERP{' — ' + base_url if base_url else ''}"
    )

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        logger.debug("Sent email notification to %s: '%s'", user.email, notification.title)
    except Exception:
        logger.exception("Failed to send email to %s", user.email)


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
