from rest_framework import parsers, status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.importer.api.serializers import (
    ImportMappingSerializer,
    ImportSessionSerializer,
    ImportUploadSerializer,
)
from apps.importer.models import ImportSession
from apps.importer.services import (
    auto_map_columns,
    get_available_fields,
    parse_file,
    validate_data,
)
from apps.importer.tasks import process_import


class ImportSessionViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Import data from CSV/Excel files.

    POST   /api/import/upload/          — Upload file + select target model
    GET    /api/import/{id}/            — Get session status
    GET    /api/import/{id}/fields/     — Available fields for target model
    PATCH  /api/import/{id}/mapping/    — Update column mapping
    POST   /api/import/{id}/validate/   — Dry-run validation
    POST   /api/import/{id}/apply/      — Apply import (create records)
    GET    /api/import/                 — List user's import sessions
    """

    serializer_class = ImportSessionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]

    def get_queryset(self):
        return ImportSession.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        """Upload file and create import session."""
        serializer = ImportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data["file"]
        session = ImportSession.objects.create(
            user=request.user,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            target_model=serializer.validated_data["target_model"],
        )

        # Parse file and extract columns
        columns = parse_file(session)
        # Auto-map columns
        mapping = auto_map_columns(session)

        session.refresh_from_db()
        return Response(
            ImportSessionSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def fields(self, request, pk=None):
        """Get available fields for the target model."""
        session = self.get_object()
        fields = get_available_fields(session.target_model)
        return Response({"fields": fields})

    @action(detail=True, methods=["patch"])
    def mapping(self, request, pk=None):
        """Update column mapping."""
        session = self.get_object()
        serializer = ImportMappingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.column_mapping = serializer.validated_data["column_mapping"]
        session.save(update_fields=["column_mapping"])

        return Response(ImportSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        """Validate data (dry-run). Returns preview + errors."""
        session = self.get_object()
        if not session.column_mapping:
            return Response(
                {"detail": "Column mapping is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = validate_data(session)
        return Response(result)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        """Apply import — create records. Async for large files."""
        session = self.get_object()
        if not session.column_mapping:
            return Response(
                {"detail": "Column mapping is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if session.status == ImportSession.Status.COMPLETE:
            return Response(
                {"detail": "Import already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # For small files — sync, for large — async via Celery
        if session.total_rows > 100:
            process_import.delay(session.pk)
            session.status = ImportSession.Status.PROCESSING
            session.save(update_fields=["status"])
            return Response({"status": "processing", "detail": "Import queued."})

        from apps.importer.services import apply_import
        result = apply_import(session)
        session.refresh_from_db()
        return Response({
            **result,
            "session": ImportSessionSerializer(session).data,
        })
