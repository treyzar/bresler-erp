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

    # Class-level shared state: {room_group_name: {channel_name: user_info}}
    # where user_info = {"username", "full_name", "avatar"}.
    # Safe without a lock: Channels runs a single event loop per process
    # and we never await between read and write of this dict.
    _rooms: dict[str, dict[str, dict]] = {}

    @staticmethod
    def _user_info(user) -> dict:
        if not (user and user.is_authenticated):
            return {"username": "anonymous", "full_name": "Гость", "avatar": None}
        return {
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "avatar": user.avatar.url if user.avatar else None,
        }

    async def connect(self):
        self.order_number = self.scope["url_route"]["kwargs"]["order_number"]
        self.room_group_name = f"order_{self.order_number}"
        self.user_info = self._user_info(self.scope.get("user"))

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        room = self._rooms.setdefault(self.room_group_name, {})
        usernames_before = {info["username"] for info in room.values()}
        room[self.channel_name] = self.user_info

        # Send the current roster only to the newly-joined channel,
        # deduplicated by username (multiple tabs -> one entry).
        seen: set[str] = set()
        roster: list[dict] = []
        for info in room.values():
            if info["username"] in seen:
                continue
            seen.add(info["username"])
            roster.append(info)

        await self.send(
            text_data=json.dumps(
                {
                    "type": "roster",
                    "users": roster,
                }
            )
        )

        # Broadcast the join only if this user wasn't already present;
        # additional tabs from the same user shouldn't emit duplicates.
        if self.user_info["username"] not in usernames_before:
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "user_joined", "user": self.user_info},
            )

    async def disconnect(self, close_code):
        room_group_name = getattr(self, "room_group_name", None)
        if room_group_name is None:
            return

        room = self._rooms.get(room_group_name, {})
        room.pop(self.channel_name, None)
        username = getattr(self, "user_info", {}).get("username")
        still_present = any(info["username"] == username for info in room.values())
        if not room:
            self._rooms.pop(room_group_name, None)

        if username is not None and not still_present:
            await self.channel_layer.group_send(
                room_group_name,
                {"type": "user_left", "username": username},
            )
        await self.channel_layer.group_discard(room_group_name, self.channel_name)

    async def user_joined(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_joined",
                    "user": event["user"],
                }
            )
        )

    async def user_left(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_left",
                    "username": event["username"],
                }
            )
        )
