"""DRF views для API внутреннего документооборота."""

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from ..models import Document, DocumentType
from ..services import document_service as svc
from ..services.chain_resolver import ResolveError
from .serializers import (
    ApprovalActionSerializer,
    DelegateSerializer,
    DocumentAttachmentSerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentTypeSerializer,
)

User = get_user_model()


class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Каталог активных типов документов (для выбора при создании)."""
    serializer_class = DocumentTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "code"

    def get_queryset(self):
        qs = DocumentType.objects.filter(is_active=True).select_related(
            "default_chain", "numbering_sequence",
        ).order_by("category", "name")

        user = self.request.user
        # initiator_resolver: author доступны всем, group:* — только членам группы.
        allowed_codes = []
        for dt in qs:
            if dt.initiator_resolver == DocumentType.InitiatorResolver.AUTHOR:
                allowed_codes.append(dt.code)
                continue
            if dt.initiator_resolver.startswith("group:"):
                group_name = dt.initiator_resolver.split(":", 1)[1]
                if user.groups.filter(name=group_name).exists() or user.groups.filter(name="admin").exists():
                    allowed_codes.append(dt.code)
        return qs.filter(code__in=allowed_codes)


def _can_approve(step, user) -> bool:
    return step is not None and step.approver_id == user.pk and step.status == step.Status.PENDING


class DocumentViewSet(viewsets.ModelViewSet):
    """CRUD + экшены жизненного цикла документа."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Document.objects.for_user(self.request.user).select_related(
            "type", "author", "addressee", "current_step",
            "current_step__approver",
        )

        # Фильтры для вкладок ЛК.
        tab = self.request.query_params.get("tab")
        user = self.request.user
        if tab == "inbox":
            qs = qs.filter(current_step__approver=user, status=Document.Status.PENDING)
        elif tab == "outbox":
            qs = qs.filter(author=user, status__in=[
                Document.Status.PENDING, Document.Status.REVISION_REQUESTED,
            ])
        elif tab == "drafts":
            qs = qs.filter(author=user, status=Document.Status.DRAFT)
        elif tab == "archive":
            qs = qs.filter(status__in=[
                Document.Status.APPROVED, Document.Status.REJECTED, Document.Status.CANCELLED,
            ])

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        type_code = self.request.query_params.get("type")
        if type_code:
            qs = qs.filter(type__code=type_code)

        return qs.distinct().order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentCreateSerializer
        if self.action in ("list",):
            return DocumentListSerializer
        return DocumentDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = DocumentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            doc = svc.create_draft(
                author=request.user,
                doc_type=data["type"],
                field_values=data.get("field_values") or {},
                title=data.get("title", ""),
                addressee=data.get("addressee"),
            )
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DocumentDetailSerializer(doc).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        doc = self.get_object()
        if doc.author_id != request.user.pk:
            return Response({"detail": "Редактировать может только автор"}, status=status.HTTP_403_FORBIDDEN)
        try:
            svc.update_draft(
                doc,
                field_values=request.data.get("field_values"),
                title=request.data.get("title"),
            )
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DocumentDetailSerializer(doc).data)

    def destroy(self, request, *args, **kwargs):
        # «Удаление» черновика = cancel.
        doc = self.get_object()
        try:
            svc.cancel(doc, request.user)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ---- actions ----

    @action(detail=True, methods=["post"])
    def submit(self, request, *args, **kwargs):
        doc = self.get_object()
        try:
            svc.submit(doc, request.user)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except (svc.DocumentServiceError, ResolveError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        doc.refresh_from_db()
        return Response(DocumentDetailSerializer(doc).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, *args, **kwargs):
        doc = self.get_object()
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            svc.approve(
                doc, request.user,
                comment=ser.validated_data.get("comment", ""),
                signature_image=ser.validated_data.get("signature_image", ""),
            )
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        doc.refresh_from_db()
        return Response(DocumentDetailSerializer(doc).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, *args, **kwargs):
        doc = self.get_object()
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = (ser.validated_data.get("comment") or "").strip()
        try:
            svc.reject(doc, request.user, comment=comment)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        doc.refresh_from_db()
        return Response(DocumentDetailSerializer(doc).data)

    @action(detail=True, methods=["post"], url_path="request-revision")
    def request_revision(self, request, *args, **kwargs):
        doc = self.get_object()
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = (ser.validated_data.get("comment") or "").strip()
        try:
            svc.request_revision(doc, request.user, comment=comment)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        doc.refresh_from_db()
        return Response(DocumentDetailSerializer(doc).data)

    @action(detail=True, methods=["post"])
    def delegate(self, request, *args, **kwargs):
        doc = self.get_object()
        ser = DelegateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        step = doc.current_step
        if not _can_approve(step, request.user):
            return Response({"detail": "У вас нет активного шага для делегирования"}, status=status.HTTP_403_FORBIDDEN)
        try:
            to_user = User.objects.get(pk=ser.validated_data["to_user"])
        except User.DoesNotExist:
            return Response({"detail": "Получатель делегирования не найден"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            svc.delegate(step, request.user, to_user)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except svc.DocumentServiceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        doc.refresh_from_db()
        return Response(DocumentDetailSerializer(doc).data)

    @action(detail=False, methods=["get"], url_path="inbox-count")
    def inbox_count(self, request, *args, **kwargs):
        """Счётчик «ждут меня» для индикатора в меню."""
        n = Document.objects.filter(
            current_step__approver=request.user,
            status=Document.Status.PENDING,
        ).count()
        return Response({"count": n})

    @action(detail=True, methods=["post"], url_path="upload-attachment", parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, *args, **kwargs):
        doc = self.get_object()
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "Нужно передать файл в form-data под ключом 'file'"}, status=400)
        # Только автор или активный согласующий могут прикладывать.
        is_author = doc.author_id == request.user.pk
        is_approver = doc.steps.filter(approver=request.user, status="pending").exists()
        if not (is_author or is_approver):
            return Response({"detail": "Нет прав прикреплять файлы"}, status=status.HTTP_403_FORBIDDEN)
        step = doc.current_step if is_approver else None
        from ..models import DocumentAttachment
        att = DocumentAttachment.objects.create(
            document=doc,
            file=f,
            file_name=f.name,
            file_size=f.size,
            uploaded_by=request.user,
            step=step,
        )
        return Response(DocumentAttachmentSerializer(att).data, status=status.HTTP_201_CREATED)
