"""DRF serializers для API внутреннего документооборота."""

from rest_framework import serializers

from ..models import (
    ApprovalChainTemplate,
    ApprovalStep,
    Document,
    DocumentAttachment,
    DocumentType,
)


class ApprovalChainTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalChainTemplate
        fields = ["id", "name", "description", "steps", "is_default", "is_active"]
        read_only_fields = fields


class DocumentTypeSerializer(serializers.ModelSerializer):
    default_chain = ApprovalChainTemplateSerializer(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = DocumentType
        fields = [
            "code", "name", "description", "category", "category_display",
            "icon", "field_schema", "body_template", "title_template",
            "default_chain",
            "requires_drawn_signature", "visibility", "tenancy_override",
            "initiator_resolver", "addressee_mode", "is_active",
        ]
        read_only_fields = fields


class UserLiteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField(source="get_full_name")
    full_name_short = serializers.CharField()
    position = serializers.CharField()


class ApprovalStepSerializer(serializers.ModelSerializer):
    approver = UserLiteSerializer(read_only=True)
    original_approver = UserLiteSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = ApprovalStep
        fields = [
            "id", "order", "parallel_group", "role_key", "role_label",
            "action", "action_display",
            "approver", "original_approver",
            "status", "status_display",
            "decided_at", "comment", "sla_due_at",
        ]
        read_only_fields = fields


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserLiteSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAttachment
        fields = [
            "id", "file", "file_url", "file_name", "file_size",
            "uploaded_by", "step", "uploaded_at",
        ]
        read_only_fields = ["id", "file_url", "file_name", "file_size", "uploaded_by", "uploaded_at"]
        extra_kwargs = {
            "file": {"write_only": True},
            "step": {"required": False, "allow_null": True},
        }

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None


class DocumentListSerializer(serializers.ModelSerializer):
    """Короткая версия для списков: «Мои документы», «Ждут меня» и т.д."""
    type_name = serializers.CharField(source="type.name", read_only=True)
    type_code = serializers.CharField(source="type.code", read_only=True)
    type_icon = serializers.CharField(source="type.icon", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    author = UserLiteSerializer(read_only=True)
    addressee = UserLiteSerializer(read_only=True)
    current_step_label = serializers.SerializerMethodField()
    current_step_approver = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "number", "title",
            "type_code", "type_name", "type_icon",
            "status", "status_display",
            "author", "addressee",
            "current_step_label", "current_step_approver",
            "created_at", "submitted_at", "closed_at",
        ]
        read_only_fields = fields

    def get_current_step_label(self, obj):
        return obj.current_step.role_label if obj.current_step else None

    def get_current_step_approver(self, obj):
        if not obj.current_step or not obj.current_step.approver_id:
            return None
        return UserLiteSerializer(obj.current_step.approver).data


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Полная версия для страницы документа."""
    type = DocumentTypeSerializer(read_only=True)
    author = UserLiteSerializer(read_only=True)
    addressee = UserLiteSerializer(read_only=True)
    steps = ApprovalStepSerializer(many=True, read_only=True)
    attachments = DocumentAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "number", "title",
            "type", "author", "addressee",
            "field_values", "body_rendered",
            "header_snapshot", "chain_snapshot",
            "status", "status_display", "current_step",
            "steps", "attachments",
            "created_at", "submitted_at", "closed_at",
        ]
        read_only_fields = [
            "id", "number", "body_rendered", "header_snapshot",
            "chain_snapshot", "status", "current_step",
            "steps", "attachments",
            "created_at", "submitted_at", "closed_at",
        ]


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Создание черновика: автор выбирает type + заполняет field_values."""
    type = serializers.SlugRelatedField(
        slug_field="code", queryset=DocumentType.objects.filter(is_active=True),
    )

    class Meta:
        model = Document
        fields = ["type", "title", "field_values", "addressee"]

    def validate_field_values(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("field_values должен быть dict")
        return value


class ApprovalActionSerializer(serializers.Serializer):
    """Payload для approve / reject / request_revision."""
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    signature_image = serializers.CharField(required=False, allow_blank=True, default="")


class DelegateSerializer(serializers.Serializer):
    to_user = serializers.IntegerField()
