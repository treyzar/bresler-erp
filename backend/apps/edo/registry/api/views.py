import os

from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import HasModuleAccess
from apps.edo.registry.models import Letter, LetterFile

from .filters import LetterFilter
from .serializers import (
    LetterCreateSerializer,
    LetterDetailSerializer,
    LetterFileSerializer,
    LetterHistorySerializer,
    LetterListSerializer,
    LetterUpdateSerializer,
)


class IsOwnerOrExecutor(permissions.BasePermission):
    """Only letter creator, executor, or superuser may modify."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        return obj.created_by_id == request.user.id or obj.executor_id == request.user.id


class LetterViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess("edo")]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = LetterFilter
    ordering_fields = ["seq", "date", "created_at"]
    ordering = ["-seq"]
    search_fields = ["number", "subject", "recipient", "sender"]

    def get_permissions(self):
        perms = super().get_permissions()
        if self.action in ("update", "partial_update", "destroy"):
            perms.append(IsOwnerOrExecutor())
        return perms

    def get_queryset(self):
        return Letter.objects.select_related("executor", "created_by").prefetch_related("files").all()

    def get_serializer_class(self):
        if self.action == "list":
            return LetterListSerializer
        if self.action == "create":
            return LetterCreateSerializer
        if self.action in ("update", "partial_update"):
            return LetterUpdateSerializer
        return LetterDetailSerializer

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser], url_path="files")
    def upload_files(self, request, pk=None):
        letter = self.get_object()
        uploaded = []
        for f in request.FILES.getlist("files"):
            ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else ""
            letter_file = LetterFile(
                letter=letter,
                file=f,
                file_name=f.name,
                file_type=ext,
                file_size=f.size,
                uploaded_by=request.user,
            )
            letter_file.full_clean()
            letter_file.save()
            uploaded.append(letter_file)
        return Response(LetterFileSerializer(uploaded, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="files/(?P<file_id>[^/.]+)")
    def delete_file(self, request, pk=None, file_id=None):
        letter = self.get_object()
        try:
            letter_file = letter.files.get(pk=file_id)
        except LetterFile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        letter_file.file.delete(save=False)
        letter_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="files/(?P<file_id>[^/.]+)/download")
    def download_file(self, request, pk=None, file_id=None):
        letter = self.get_object()
        try:
            letter_file = letter.files.get(pk=file_id)
        except LetterFile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(letter_file.file.open("rb"), as_attachment=True)
        response["Content-Disposition"] = f'attachment; filename="{os.path.basename(letter_file.file_name)}"'
        return response

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        letter = self.get_object()
        records = letter.history.all().order_by("-history_date")
        serializer = LetterHistorySerializer(records, many=True)
        return Response(serializer.data)
