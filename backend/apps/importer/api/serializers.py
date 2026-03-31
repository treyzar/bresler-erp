from rest_framework import serializers

from apps.importer.models import ImportSession


class ImportSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportSession
        fields = [
            "id", "original_filename", "target_model", "status",
            "columns", "column_mapping", "total_rows",
            "success_count", "error_count", "error_details",
            "created_at", "updated_at",
        ]
        read_only_fields = fields


class ImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    target_model = serializers.ChoiceField(choices=ImportSession.TargetModel.choices)


class ImportMappingSerializer(serializers.Serializer):
    column_mapping = serializers.DictField(child=serializers.CharField())
