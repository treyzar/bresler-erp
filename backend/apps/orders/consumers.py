import json

from channels.generic.websocket import AsyncWebsocketConsumer


class OrderPresenceConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for tracking who is viewing an order."""

    async def connect(self):
        self.order_number = self.scope["url_route"]["kwargs"]["order_number"]
        self.room_group_name = f"order_{self.order_number}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Notify others that someone joined
        user = self.scope.get("user")
        username = user.username if user and user.is_authenticated else "anonymous"
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined",
                "username": username,
            },
        )

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        username = user.username if user and user.is_authenticated else "anonymous"
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_left",
                "username": username,
            },
        )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_joined",
            "username": event["username"],
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_left",
            "username": event["username"],
        }))
