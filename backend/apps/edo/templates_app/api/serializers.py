from rest_framework import serializers
from ..models.models import Template, TemplateVersion, ShareLink

class TemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVersion
        # Добавили editor_content
        fields = ['id', 'version_number', 'html_content', 'editor_content', 'docx_file', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_at']

class ShareLinkSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()
    expires_at = serializers.SerializerMethodField()

    class Meta:
        model = ShareLink
        fields = ['id', 'token', 'ttl_days', 'max_uses', 'current_uses', 'is_valid', 'expires_at', 'created_at']
        read_only_fields = ['id', 'token', 'current_uses', 'is_valid', 'expires_at', 'created_at']

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_expires_at(self, obj):
        from django.utils import timezone
        return obj.created_at + timezone.timedelta(days=obj.ttl_days)

class TemplateSerializer(serializers.ModelSerializer):
    placeholders = serializers.SerializerMethodField()
    share_links = ShareLinkSerializer(many=True, read_only=True)
    latest_version = serializers.SerializerMethodField()

    class Meta:
        model = Template
        fields = [
            'id', 'title', 'description', 'template_type', 'visibility',
            'owner_id', 'allowed_users', 
            'html_content', 'editor_content', # Добавлено editor_content
            'docx_file',
            'placeholders', 'share_links', 'latest_version',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'placeholders', 'share_links', 'latest_version', 'created_at', 'updated_at']

    def get_placeholders(self, obj):
        return obj.get_placeholders()

    def get_latest_version(self, obj):
        version = obj.versions.first()
        if version:
            return version.version_number
        return 0

class TemplateListSerializer(serializers.ModelSerializer):
    placeholders = serializers.SerializerMethodField()

    class Meta:
        model = Template
        fields = [
            'id', 'title', 'description', 'template_type', 'visibility',
            'owner_id', 'placeholders', 'created_at', 'updated_at'
        ]

    def get_placeholders(self, obj):
        return obj.get_placeholders()

class RenderSerializer(serializers.Serializer):
    values = serializers.DictField(child=serializers.CharField(allow_blank=True))
