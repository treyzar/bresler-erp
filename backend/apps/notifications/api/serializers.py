from rest_framework import serializers

from apps.notifications.models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    target_repr = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "category",
            "is_read",
            "link",
            "target_repr",
            "created_at",
        ]
        read_only_fields = fields

    def get_target_repr(self, obj) -> str | None:
        if obj.target:
            return str(obj.target)
        return None


class UnreadCountSerializer(serializers.Serializer):
    count = serializers.IntegerField()


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "order_created",
            "order_status_changed",
            "order_deadline",
            "contract_payment",
            "comments",
            "import_completed",
        ]
