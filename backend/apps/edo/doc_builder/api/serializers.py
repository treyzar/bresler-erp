from rest_framework import serializers
from ..models.models import DocumentProject, DocumentFile


class DocumentFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFile
        fields = ['id', 'file_type', 'file', 'created_at']
        read_only_fields = ['id', 'created_at']


class DocumentProjectSerializer(serializers.ModelSerializer):
    files = DocumentFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = DocumentProject
        fields = [
            'id', 'owner_id', 'title', 'schema_version',
            'content_json', 'content_text', 'created_at', 'updated_at', 'files'
        ]
        read_only_fields = ['id', 'owner_id', 'created_at', 'updated_at']


class DocumentProjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentProject
        fields = ['id', 'title', 'updated_at', 'created_at']


class DocumentProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentProject
        fields = ['title', 'content_json', 'content_text']


class DocumentProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentProject
        fields = ['title', 'content_json', 'content_text']


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, value):
        max_size = 20 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size exceeds 20MB limit.')
        return value


class DocxUploadSerializer(FileUploadSerializer):
    def validate_file(self, value):
        value = super().validate_file(value)
        if not value.name.lower().endswith('.docx'):
            raise serializers.ValidationError('Only .docx files are allowed.')
        return value


class PdfUploadSerializer(FileUploadSerializer):
    def validate_file(self, value):
        value = super().validate_file(value)
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('Only .pdf files are allowed.')
        return value


class JsonUploadSerializer(FileUploadSerializer):
    def validate_file(self, value):
        value = super().validate_file(value)
        ext = value.name.lower()
        if not (ext.endswith('.json') or ext.endswith('.docflow.json')):
            raise serializers.ValidationError('Only .json or .docflow.json files are allowed.')
        return value
