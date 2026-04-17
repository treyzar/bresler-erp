"""Event handlers for comments — notify relevant users when a comment is posted."""

import re

from apps.core.events import on_event

MENTION_PATTERN = re.compile(r"@([\w.-]+)")


@on_event("comment.created", async_task=True)
def on_comment_created(event_name, instance, user=None, target=None, **kwargs):
    """Notify relevant users when a comment is posted on a document."""
    from apps.notifications.services import create_notification

    if target is None:
        return

    model_name = target._meta.model_name

    # Determine recipients based on the target model
    recipients = _get_recipients(target, exclude_user=user)
    if not recipients:
        return

    author_name = user.get_full_name() if user else "Пользователь"
    target_str = str(target)

    create_notification(
        recipients=recipients,
        title=f"{author_name} прокомментировал {target_str}",
        message=instance.text[:120],
        target=target,
        deduplicate_key=f"comment.{model_name}",
        deduplicate_hours=1,  # Allow comments more frequently than other notifications
    )


@on_event("comment.created", async_task=True)
def notify_mentioned_users(event_name, instance, user=None, target=None, **kwargs):
    """Notify users explicitly @mentioned in the comment text."""
    from django.contrib.auth import get_user_model

    from apps.notifications.services import create_notification

    usernames = set(MENTION_PATTERN.findall(instance.text or ""))
    if not usernames:
        return

    User = get_user_model()
    mentioned = User.objects.filter(username__in=usernames, is_active=True)
    if user:
        mentioned = mentioned.exclude(pk=user.pk)

    if not mentioned.exists():
        return

    author_name = user.get_full_name() if user else "Пользователь"
    create_notification(
        recipients=list(mentioned),
        title=f"{author_name} упомянул вас в комментарии",
        message=instance.text[:200],
        target=target,
        deduplicate_key=f"comment.mention.{instance.id}",
        deduplicate_hours=0,
    )


def _get_recipients(target, exclude_user=None):
    """Get users who should be notified about a comment on this object."""
    recipients = set()

    # For Orders: notify all managers
    if hasattr(target, "managers"):
        for manager in target.managers.filter(is_active=True):
            recipients.add(manager)

    # For Contracts: notify order managers
    if hasattr(target, "order") and hasattr(target.order, "managers"):
        for manager in target.order.managers.filter(is_active=True):
            recipients.add(manager)

    # Exclude the comment author
    if exclude_user:
        recipients.discard(exclude_user)

    return list(recipients)
