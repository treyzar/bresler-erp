# project/app/serializers.py
from rest_framework import serializers
from ..models.models import ParsedDocument


class ParsedDocumentSerializer(serializers.ModelSerializer):
    editor_elements = serializers.SerializerMethodField()

    class Meta:
        model = ParsedDocument
        fields = [
            'id', 'original_filename', 'file_type', 'file_size',
            'page_count', 'extracted_text', 'editor_elements', # <-- поле тут
            'original_file', 'created_at'
        ]
        read_only_fields = fields

    def get_editor_elements(self, obj: ParsedDocument):
        # Возвращаем элементы ВСЕГДА, если они есть. 
        # Фронтенду они нужны сразу после парсинга.
        return obj.editor_json.get('elements', [])

class ParseUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        max_size = 20 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size exceeds 20MB limit.')
        
        ext = value.name.lower().split('.')[-1]
        # Добавляем html в список разрешенных
        if ext not in ['pdf', 'docx', 'html', 'htm']: 
            raise serializers.ValidationError('Only PDF, DOCX and HTML files are allowed.')
        
        return value