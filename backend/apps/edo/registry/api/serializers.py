from rest_framework import serializers

from apps.edo.registry.models import Letter, LetterFile
from apps.users.api.serializers import UserSerializer


class LetterFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LetterFile
        fields = ("id", "file", "file_name", "file_type", "file_size", "uploaded_at", "uploaded_by")
        read_only_fields = ("id", "uploaded_at", "uploaded_by", "file_name", "file_type", "file_size")


class LetterListSerializer(serializers.ModelSerializer):
    """Compact serializer for the registry table. Applies department visibility."""

    executor_name = serializers.CharField(source="executor.get_full_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)
    files_count = serializers.SerializerMethodField()
    is_hidden = serializers.SerializerMethodField()

    class Meta:
        model = Letter
        fields = (
            "id",
            "number",
            "date",
            "direction",
            "direction_display",
            "recipient",
            "sender",
            "subject",
            "executor_name",
            "created_by_name",
            "files_count",
            "is_hidden",
            "created_at",
        )

    def _has_access(self, letter) -> bool:
        request = self.context.get("request")
        if not request:
            return True
        from apps.edo.registry.services.registry_service import check_department_access
        return check_department_access(request.user, letter)

    def get_files_count(self, letter) -> int:
        return letter.files.count()

    def get_is_hidden(self, letter) -> bool:
        return not self._has_access(letter)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._has_access(instance):
            data["recipient"] = "— скрыто —"
            data["sender"] = "— скрыто —"
            data["subject"] = "— скрыто —"
        return data


class LetterDetailSerializer(serializers.ModelSerializer):
    executor = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)
    files = LetterFileSerializer(many=True, read_only=True)

    class Meta:
        model = Letter
        fields = (
            "id",
            "number",
            "date",
            "direction",
            "direction_display",
            "recipient",
            "sender",
            "subject",
            "executor",
            "created_by",
            "note",
            "files",
            "created_at",
            "updated_at",
        )


class LetterCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Letter
        fields = ("id", "number", "date", "direction", "recipient", "sender", "subject", "executor", "note")
        read_only_fields = ("id", "number")

    def create(self, validated_data):
        from apps.edo.registry.services.registry_service import generate_letter_number
        request = self.context["request"]
        validated_data["created_by"] = request.user
        number, seq = generate_letter_number(request.user)
        validated_data["number"] = number
        validated_data["seq"] = seq
        return super().create(validated_data)


class LetterUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Letter
        fields = ("date", "direction", "recipient", "sender", "subject", "executor", "note")


class LetterHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField(source="history_id")
    date = serializers.DateTimeField(source="history_date")
    user = serializers.SerializerMethodField()
    type = serializers.CharField(source="history_type")
    changes = serializers.SerializerMethodField()

    TRACKED_FIELDS = ("date", "direction", "recipient", "sender", "subject", "note", "executor_id")
    FIELD_LABELS = {
        "date": "Дата",
        "direction": "Направление",
        "recipient": "Получатель",
        "sender": "Отправитель",
        "subject": "Тема",
        "note": "Заметки",
        "executor_id": "Исполнитель",
    }

    def get_user(self, record) -> str | None:
        if record.history_user:
            return record.history_user.get_full_name() or record.history_user.username
        return None

    def get_changes(self, record) -> list:
        prev = record.prev_record
        if not prev:
            return []
        changes = []
        for field in self.TRACKED_FIELDS:
            old_val = getattr(prev, field, None)
            new_val = getattr(record, field, None)
            if old_val != new_val:
                changes.append({
                    "field": self.FIELD_LABELS.get(field, field),
                    "old": str(old_val) if old_val is not None else "",
                    "new": str(new_val) if new_val is not None else "",
                })
        return changes
