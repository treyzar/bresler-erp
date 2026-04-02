"""Event handlers for comments — notify relevant users when a comment is posted."""

from apps.core.events import on_event


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
