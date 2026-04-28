"""WebSocket consumer for real-time comment updates on any target object."""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class CommentsConsumer(AsyncWebsocketConsumer):
    """
    Pushes comment create/delete events to all clients viewing the same target.

    Connect: ws/comments/{target_model}/{target_id}/
    Group:   comments_{target_model}_{target_id}
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.target_model = self.scope["url_route"]["kwargs"]["target_model"]
        self.target_id = self.scope["url_route"]["kwargs"]["target_id"]
        self.group_name = f"comments_{self.target_model}_{self.target_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_event(self, event):
        """Forward broadcast (type=comment.event) to the connected client."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "comment",
                    "event": event["event"],
                    "comment_id": event["comment_id"],
                }
            )
        )
