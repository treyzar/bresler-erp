"""Helper for broadcasting comment events over Channels."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.comments.models import Comment


def broadcast_comment_event(comment: Comment, event: str) -> None:
    """
    Push a comment event to every client viewing the same target.

    event: "created" | "deleted"
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    target_model = comment.content_type.model
    target_id = comment.object_id
    group_name = f"comments_{target_model}_{target_id}"

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "comment.event",
            "event": event,
            "comment_id": comment.id,
        },
    )
