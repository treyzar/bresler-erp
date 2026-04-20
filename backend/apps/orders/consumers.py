import json

from channels.generic.websocket import AsyncWebsocketConsumer


class OrderPresenceConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for tracking who is viewing an order.

    On connect, the joining client receives the full current roster
    (addressed to its channel only, not the whole group). Joins and
    leaves are broadcast to the group, but deduplicated by username so
    multiple tabs from the same user show up as a single presence entry
    and closing one of several tabs doesn't remove the user from other
    viewers' lists.
    """

    # Class-level shared state: {room_group_name: {channel_name: username}}
    # Safe without a lock: Channels runs a single event loop per process
    # and we never await between read and write of this dict.
    _rooms: dict[str, dict[str, str]] = {}

    async def connect(self):
        self.order_number = self.scope["url_route"]["kwargs"]["order_number"]
        self.room_group_name = f"order_{self.order_number}"

        user = self.scope.get("user")
        self.username = user.username if user and user.is_authenticated else "anonymous"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        room = self._rooms.setdefault(self.room_group_name, {})
        was_present = self.username in room.values()
        room[self.channel_name] = self.username

        # Send the current roster only to the newly-joined channel.
        await self.send(text_data=json.dumps({
            "type": "roster",
            "usernames": sorted(set(room.values())),
        }))

        # Broadcast the join only if this is a new user for the room;
        # additional tabs from the same user should not emit duplicates.
        if not was_present:
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "user_joined", "username": self.username},
            )

    async def disconnect(self, close_code):
        room_group_name = getattr(self, "room_group_name", None)
        if room_group_name is None:
            return

        room = self._rooms.get(room_group_name, {})
        room.pop(self.channel_name, None)
        username = getattr(self, "username", None)
        still_present = username in room.values()
        if not room:
            self._rooms.pop(room_group_name, None)

        if username is not None and not still_present:
            await self.channel_layer.group_send(
                room_group_name,
                {"type": "user_left", "username": username},
            )
        await self.channel_layer.group_discard(room_group_name, self.channel_name)

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
