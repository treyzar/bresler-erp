"""DRF views для API внутреннего документооборота."""

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from ..models import ApprovalChainTemplate, ApprovalStep, Document, DocumentType
from ..services import document_service as svc
from ..services.chain_resolver import ResolveError
from ..services.email_token import (
    ACTION_APPROVE,
    ACTION_REJECT,
    InvalidEmailToken,
    parse_token,
)
from .serializers import (
    ApprovalActionSerializer,
    ApprovalChainTemplateAdminSerializer,
    DelegateSerializer,
    DocumentAttachmentSerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentTypeAdminSerializer,
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
        is_admin = user.groups.filter(name="admin").exists()
        allowed_codes = []
        for dt in qs:
            ir = dt.initiator_resolver
            if is_admin:
                allowed_codes.append(dt.code)
                continue
            if ir == DocumentType.InitiatorResolver.AUTHOR:
                allowed_codes.append(dt.code)
            elif ir == DocumentType.InitiatorResolver.DEPARTMENT_HEAD:
                if user.is_department_head:
                    allowed_codes.append(dt.code)
            elif ir.startswith("group:"):
                group_name = ir.split(":", 1)[1]
                if user.groups.filter(name=group_name).exists():
                    allowed_codes.append(dt.code)
        return qs.filter(code__in=allowed_codes)


def _can_approve(step, user) -> bool:
    return step is not None and step.approver_id == user.pk and step.status == step.Status.PENDING


class DocumentViewSet(viewsets.ModelViewSet):
    """CRUD + экшены жизненного цикла документа."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        # Фильтры для вкладок ЛК.
        tab = self.request.query_params.get("tab")

        # inbox использует специальный queryset, который учитывает коллективные
        # шаги (group:NAME[@company]) — иначе видно только лично назначенных
        # как approver, а коллективные шаги обходят стороной всю группу.
        if tab == "inbox":
            qs = Document.objects.inbox_for(user)
        else:
            qs = Document.objects.for_user(user)

        qs = qs.select_related(
            "type", "author", "addressee", "current_step",
            "current_step__approver",
        )

        if tab == "outbox":
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

        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(number__icontains=search) | Q(title__icontains=search))

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

    @action(detail=True, methods=["get"])
    def pdf(self, request, *args, **kwargs):
        """PDF-экспорт документа. Автоматически кешируется; возвращает attachment."""
        doc = self.get_object()
        if not doc.body_rendered:
            return Response(
                {"detail": "PDF доступен только для отправленных документов"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from ..services.pdf_export import export_pdf
        try:
            pdf_bytes = export_pdf(doc)
        except Exception as e:
            return Response({"detail": f"PDF generation failed: {e}"}, status=500)
        filename = f"{doc.number or 'document'}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

    @action(detail=False, methods=["get"], url_path="inbox-count")
    def inbox_count(self, request, *args, **kwargs):
        """Счётчик «ждут меня» для индикатора в меню. Учитывает коллективные шаги."""
        n = Document.objects.inbox_for(request.user).count()
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


# ===================== email-link одобрение =====================
#
# Публичный endpoint без аутентификации: пользователь приходит по ссылке из
# письма, токен подписан SECRET_KEY и содержит (step_id, action). Логин не
# нужен — авторизация доказывается подписью. Дополнительная защита:
# - токен одноразовый: повторное использование на закрытом шаге → 400;
# - approver на момент действия должен совпадать со шагом (учёт замещения,
#   делегирования и т.п. — мы используем последнего approver, того же что
#   видел бы пользователь при логине в ЛК).


@api_view(["GET", "POST"])
@permission_classes([permissions.AllowAny])
def email_action(request, token: str):
    """Публичный endpoint: GET → preview-инфо для страницы; POST → выполнить.

    POST принимает {"comment": "..."} (для reject — обязателен).
    """
    try:
        step_id, action = parse_token(token)
    except InvalidEmailToken as e:
        return Response(
            {"detail": f"Ссылка недействительна: {e}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        step = ApprovalStep.objects.select_related("document", "approver").get(pk=step_id)
    except ApprovalStep.DoesNotExist:
        return Response(
            {"detail": "Шаг согласования не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )

    document = step.document

    if step.status != ApprovalStep.Status.PENDING:
        return Response(
            {"detail": f"Шаг уже закрыт (статус: {step.get_status_display()}). "
                       "Перейдите в систему, если хотите посмотреть документ."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        # Лёгкая «карточка» для подтверждающей страницы.
        return Response({
            "action": action,
            "document": {
                "id": document.pk,
                "number": document.number,
                "title": document.title,
                "author": (document.author.get_full_name() or document.author.username),
            },
            "step": {
                "id": step.pk,
                "role_label": step.role_label,
                "approver": (
                    step.approver.get_full_name() if step.approver else None
                ),
            },
        })

    # POST — выполняем действие. Используем подписанного approver'а как
    # пользователя для service-функции (учитываем substitute/delegate).
    if not step.approver_id:
        return Response(
            {"detail": "У шага нет назначенного согласующего"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment = (request.data.get("comment") or "").strip()
    try:
        if action == ACTION_APPROVE:
            svc.approve(document, step.approver, comment=comment)
        elif action == ACTION_REJECT:
            if not comment:
                return Response(
                    {"detail": "Комментарий обязателен при отклонении"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            svc.reject(document, step.approver, comment=comment)
        else:
            return Response({"detail": f"Неизвестное действие: {action}"},
                            status=status.HTTP_400_BAD_REQUEST)
    except PermissionDenied as e:
        return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except (svc.DocumentServiceError, ValidationError) as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    document.refresh_from_db()
    return Response({
        "ok": True,
        "action": action,
        "document_status": document.status,
    })


# ===================== Админ-CRUD для типов и цепочек =====================


class _IsEDOAdmin(permissions.BasePermission):
    """Только пользователи в группе `admin` могут писать справочники EDO."""
    message = "Доступ только для группы admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.groups.filter(name="admin").exists()


class AdminDocumentTypeViewSet(viewsets.ModelViewSet):
    """Полный CRUD типов документов — только для группы `admin`."""
    serializer_class = DocumentTypeAdminSerializer
    permission_classes = [_IsEDOAdmin]
    lookup_field = "code"
    queryset = DocumentType.objects.select_related("default_chain", "numbering_sequence").all()


class AdminApprovalChainTemplateViewSet(viewsets.ModelViewSet):
    """Полный CRUD цепочек согласования — только для группы `admin`."""
    serializer_class = ApprovalChainTemplateAdminSerializer
    permission_classes = [_IsEDOAdmin]
    queryset = ApprovalChainTemplate.objects.all()


@api_view(["GET"])
@permission_classes([_IsEDOAdmin])
def report_stuck_documents(request):
    """`?days=N` — документы, висящие в PENDING дольше N дней (default 3)."""
    from ..services.reports import stuck_documents

    days = int(request.query_params.get("days", 3))
    return Response({"results": stuck_documents(min_pending_days=days), "min_pending_days": days})


@api_view(["GET"])
@permission_classes([_IsEDOAdmin])
def report_sla_breaches(request):
    """`?days=N` — просрочки за последние N дней (default 30)."""
    from ..services.reports import sla_breaches

    days = int(request.query_params.get("days", 30))
    return Response({"results": sla_breaches(period_days=days), "period_days": days})


@api_view(["GET"])
@permission_classes([_IsEDOAdmin])
def report_top_by_type(request):
    """`?days=N&limit=L` — топ типов по числу документов за период."""
    from ..services.reports import top_by_type

    days = int(request.query_params.get("days", 30))
    limit = int(request.query_params.get("limit", 20))
    return Response({"results": top_by_type(period_days=days, limit=limit), "period_days": days})

