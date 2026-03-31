from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.notifications.api.serializers import NotificationSerializer
from apps.notifications.models import Notification
from apps.notifications.services import get_unread_count, mark_all_read, mark_read


class NotificationViewSet(ListModelMixin, GenericViewSet):
    """
    Notifications for the current user.

    list: GET /api/notifications/ — paginated list (newest first)
    unread_count: GET /api/notifications/unread-count/
    mark_read: POST /api/notifications/{id}/mark-read/
    mark_all_read: POST /api/notifications/mark-all-read/
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related(
            "target_type"
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = get_unread_count(request.user)
        return Response({"count": count})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        success = mark_read(int(pk), request.user)
        if success:
            return Response({"status": "ok"})
        return Response(
            {"status": "not_found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        count = mark_all_read(request.user)
        return Response({"status": "ok", "count": count})
