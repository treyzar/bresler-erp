from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from apps.comments.handlers import MENTION_PATTERN
from apps.comments.models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    mentioned_users = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "author",
            "author_name",
            "author_username",
            "text",
            "mentioned_users",
            "content_type",
            "object_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "author", "author_name", "author_username",
            "mentioned_users", "created_at", "updated_at",
        ]

    def get_mentioned_users(self, obj) -> dict[str, str]:
        """Map of username → full_name for every @mention in comment text."""
        usernames = set(MENTION_PATTERN.findall(obj.text or ""))
        if not usernames:
            return {}
        User = get_user_model()
        users = User.objects.filter(username__in=usernames).values(
            "username", "first_name", "last_name", "patronymic",
        )
        result = {}
        for u in users:
            parts = [u["last_name"], u["first_name"], u["patronymic"]]
            full = " ".join(p for p in parts if p).strip()
            result[u["username"]] = full or u["username"]
        return result


class CommentCreateSerializer(serializers.Serializer):
    """Serializer for creating a comment — accepts model name instead of content_type ID."""

    text = serializers.CharField(max_length=5000)
    target_model = serializers.CharField(help_text="Model name, e.g. 'order', 'orgunit', 'contract'")
    target_id = serializers.IntegerField()

    def validate_target_model(self, value):
        """Resolve model name to ContentType."""
        model_map = {
            "order": ("orders", "order"),
            "contract": ("orders", "contract"),
            "orgunit": ("directory", "orgunit"),
            "contact": ("directory", "contact"),
            "letter": ("registry", "letter"),
        }
        key = value.lower()
        if key not in model_map:
            raise serializers.ValidationError(
                f"Unknown model '{value}'. Allowed: {', '.join(model_map.keys())}"
            )
        app_label, model = model_map[key]
        try:
            return ContentType.objects.get(app_label=app_label, model=model)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError(f"ContentType not found for {app_label}.{model}")

    def validate(self, attrs):
        ct = attrs["target_model"]
        model_class = ct.model_class()
        if model_class and not model_class.objects.filter(pk=attrs["target_id"]).exists():
            raise serializers.ValidationError({"target_id": "Object not found."})
        return attrs

    def create(self, validated_data):
        return Comment.objects.create(
            author=self.context["request"].user,
            text=validated_data["text"],
            content_type=validated_data["target_model"],
            object_id=validated_data["target_id"],
        )
