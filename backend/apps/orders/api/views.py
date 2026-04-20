from django.db import models as db_models
from django.contrib.auth import get_user_model
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models.functions import Coalesce, Greatest
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.events import trigger_event
from apps.core.mixins.export import ExportMixin
from apps.core.mixins.metadata import MetadataMixin
from apps.core.workflow import ConditionNotMet, TransitionNotAllowed, WorkflowService
from apps.directory.models import Contact, Equipment, Facility, OrgUnit, TypeOfWork
from apps.orders.models import Contract, DocumentTemplate, Order, OrderFile, ShipmentBatch
from apps.orders.services.order_service import get_next_order_number
from apps.orders.services.document_gen_service import generate_document

from .filters import OrderFilter
from .serializers import (
    ContractSerializer,
    DocumentTemplateSerializer,
    GenerateDocumentSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderFileSerializer,
    OrderListSerializer,
    ShipmentBatchSerializer,
)

User = get_user_model()

# Human-readable field labels
_FIELD_LABELS = {
    "order_number": "Номер заказа",
    "tender_number": "Номер тендера",
    "status": "Статус",
    "note": "Примечание",
    "start_date": "Дата начала",
    "ship_date": "Дата отгрузки",
    "customer_org_unit": "Заказчик",
    "intermediary": "Посредник",
    "designer": "Проектировщик",
    "country": "Страна",
    "contacts": "Контакты",
    "managers": "Менеджеры",
    "equipments": "Оборудование",
    "works": "Виды работ",
    "facilities": "Объекты",
    "related_orders": "Связанные заказы",
}

_STATUS_MAP = dict(Order.Status.choices)


def _resolve_m2m_names(records, field_name):
    """Given a list of M2M through-dicts, resolve to readable names."""
    if not records or not isinstance(records, list):
        return []

    if field_name == "related_orders":
        order_ids = {r.get("to_order") or r.get("from_order") for r in records if isinstance(r, dict)}
        order_ids.discard(None)
        names = dict(Order.objects.filter(pk__in=order_ids).values_list("pk", "order_number"))
        return [f"#{names.get(r.get('to_order') or r.get('from_order'), '?')}" for r in records]

    # Map field key in through-dict → model for name resolution
    key_model_map = {
        "contact": (Contact, "full_name"),
        "user": (User, "last_name"),
        "equipment": (Equipment, "name"),
        "typeofwork": (TypeOfWork, "name"),
        "facility": (Facility, "name"),
    }

    # Find which key is in the dicts (e.g. "facility", "typeofwork", "contact")
    if not records:
        return []
    sample = records[0] if isinstance(records[0], dict) else {}
    for key, (model, name_field) in key_model_map.items():
        if key in sample:
            ids = {r[key] for r in records if isinstance(r, dict) and key in r}
            names = dict(model.objects.filter(pk__in=ids).values_list("pk", name_field))
            return [names.get(r.get(key), f"ID:{r.get(key)}") for r in records]

    return [str(r) for r in records]


def _format_change(change):
    """Format a single ModelChange into a human-readable dict."""
    field = change.field
    label = _FIELD_LABELS.get(field, field)
    old_val = change.old
    new_val = change.new

    # M2M fields come as lists of dicts
    if isinstance(old_val, list) or isinstance(new_val, list):
        old_names = set(_resolve_m2m_names(old_val, field)) if old_val else set()
        new_names = set(_resolve_m2m_names(new_val, field)) if new_val else set()

        added = sorted(new_names - old_names)
        removed = sorted(old_names - new_names)

        parts = []
        if added:
            parts.append(f"добавлены: {', '.join(added)}")
        if removed:
            parts.append(f"удалены: {', '.join(removed)}")

        return {
            "field": label,
            "old": None,
            "new": "; ".join(parts) if parts else "без изменений",
        }

    # Status field — show display value
    if field == "status":
        old_val = _STATUS_MAP.get(old_val, old_val)
        new_val = _STATUS_MAP.get(new_val, new_val)

    # FK fields — resolve to name
    if field == "customer_org_unit" and (old_val is not None or new_val is not None):
        ids = [v for v in (old_val, new_val) if v is not None]
        names = dict(OrgUnit.objects.filter(pk__in=ids).values_list("pk", "name"))
        old_val = names.get(old_val, old_val) if old_val is not None else None
        new_val = names.get(new_val, new_val) if new_val is not None else None

    if field in ("intermediary", "designer") and (old_val is not None or new_val is not None):
        ids = [v for v in (old_val, new_val) if v is not None]
        names = dict(OrgUnit.objects.filter(pk__in=ids).values_list("pk", "name"))
        old_val = names.get(old_val, old_val) if old_val is not None else None
        new_val = names.get(new_val, new_val) if new_val is not None else None

    if field == "country" and (old_val is not None or new_val is not None):
        from apps.directory.models import Country
        ids = [v for v in (old_val, new_val) if v is not None]
        names = dict(Country.objects.filter(pk__in=ids).values_list("pk", "name"))
        old_val = names.get(old_val, old_val) if old_val is not None else None
        new_val = names.get(new_val, new_val) if new_val is not None else None

    return {
        "field": label,
        "old": str(old_val) if old_val is not None else None,
        "new": str(new_val) if new_val is not None else None,
    }


_ORDER_SNAPSHOT_SCALARS = (
    "order_type", "order_number", "tender_number", "status", "note",
    "start_date", "ship_date",
    "customer_org_unit_id", "intermediary_id", "designer_id", "country_id",
)
_ORDER_SNAPSHOT_M2M = ("contacts", "managers", "equipments", "works", "facilities", "related_orders")


def _snapshot_order(order):
    """Take a comparable snapshot of an Order for diffing before/after update."""
    snap = {f: getattr(order, f) for f in _ORDER_SNAPSHOT_SCALARS}
    # Strip "_id" suffix for cleaner field names in the diff
    snap = {(k[:-3] if k.endswith("_id") else k): v for k, v in snap.items()}
    for m2m in _ORDER_SNAPSHOT_M2M:
        snap[m2m] = frozenset(getattr(order, m2m).values_list("pk", flat=True))
    return snap


class OrderViewSet(MetadataMixin, ExportMixin, viewsets.ModelViewSet):
    lookup_field = "order_number"
    lookup_value_regex = r"\d+"
    export_filename = "orders"
    meta_extra = {
        "customer": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?business_role=customer"},
        "country": {"widget": "combobox", "endpoint": "/api/directory/countries/"},
        "equipment": {"widget": "combobox", "endpoint": "/api/directory/equipment/"},
        "work": {"widget": "combobox", "endpoint": "/api/directory/works/"},
        "participant": {"widget": "combobox", "endpoint": "/api/directory/orgunits/"},
        "branch": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?unit_type=branch"},
        "division": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?unit_type=division"},
        "facility": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?unit_type=site"},
        "start_date_from": {"range_group": "start_date"},
        "start_date_to": {"range_group": "start_date"},
        "ship_date_from": {"range_group": "ship_date"},
        "ship_date_to": {"range_group": "ship_date"},
    }
    export_fields = {
        "order_number": "Номер заказа",
        "status": "Статус",
        "customer_org_unit__name": "Заказчик",
        "intermediary__name": "Посредник",
        "designer__name": "Проектировщик",
        "country__name": "Страна",
        "tender_number": "Номер тендера",
        "start_date": "Дата начала",
        "ship_date": "Дата отгрузки",
        "note": "Примечание",
        "contract__contract_number": "Номер контракта",
        "contract__amount": "Сумма контракта",
        "contract__status": "Статус оплаты",
        "created_at": "Дата создания",
    }
    queryset = Order.objects.select_related(
        "customer_org_unit",
        "intermediary",
        "designer",
        "country",
        "contract",
    ).prefetch_related(
        "contacts",
        "managers",
        "equipments",
        "works",
        "facilities__org_unit",
        "files",
        "org_units",
        "participants",
        "orderorgunit_set__org_unit",
        "orderparticipant_set__org_unit",
    )
    filterset_class = OrderFilter
    search_fields = [
        "order_number",
        "tender_number",
        "note",
        "country__name",
        "customer_org_unit__name",
        "org_units__name",
        "equipments__name",
        "works__name",
        "participants__name",
    ]
    ordering_fields = ["order_number", "start_date", "ship_date", "status", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            return qs.distinct()
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        if self.action in ("create", "update", "partial_update"):
            return OrderCreateSerializer
        return OrderDetailSerializer

    def perform_create(self, serializer):
        """Trigger order.created event AFTER full save (including M2M)."""
        order = serializer.save()
        trigger_event("order.created", instance=order, user=self.request.user)

    def perform_update(self, serializer):
        """Trigger status_changed and/or updated events when order is modified."""
        instance = serializer.instance
        old_status = instance.status
        old_snapshot = _snapshot_order(instance)

        order = serializer.save()
        new_snapshot = _snapshot_order(order)

        status_changed = old_status != order.status
        if status_changed:
            trigger_event(
                "order.status_changed",
                instance=order,
                user=self.request.user,
                old_status=old_status,
                new_status=order.status,
            )

        changed_fields = [
            k for k in old_snapshot
            if k != "status" and old_snapshot[k] != new_snapshot[k]
        ]
        if changed_fields:
            trigger_event(
                "order.updated",
                instance=order,
                user=self.request.user,
                changed_fields=changed_fields,
            )

    @action(detail=True, methods=["get"])
    def transitions(self, request, order_number=None):
        """Get available status transitions for the current user."""
        from apps.orders.workflows import ORDER_WORKFLOW

        order = self.get_object()
        available = WorkflowService.get_available_transitions(
            ORDER_WORKFLOW, order, user=request.user
        )
        return Response(available)

    @action(detail=True, methods=["post"])
    def transition(self, request, order_number=None):
        """Execute a status transition with validation."""
        from apps.orders.workflows import ORDER_WORKFLOW

        order = self.get_object()
        to_status = request.data.get("status")
        if not to_status:
            return Response(
                {"detail": "Поле 'status' обязательно"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            WorkflowService.transition(
                ORDER_WORKFLOW, order, to_status, user=request.user
            )
        except TransitionNotAllowed as e:
            return Response({"detail": e.message}, status=status.HTTP_403_FORBIDDEN)
        except ConditionNotMet as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)

        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="fuzzy-search")
    def fuzzy_search(self, request):
        query = request.query_params.get("q", "")
        if not query or len(query) < 3:
            return Response([])

        # Use Coalesce to handle NULLs and Greatest to pick the best match
        similar_orders = (
            Order.objects.annotate(
                sim_tender=Coalesce(TrigramSimilarity("tender_number", query), 0.0),
                sim_note=Coalesce(TrigramSimilarity("note", query), 0.0),
                sim_customer=Coalesce(TrigramSimilarity("customer_org_unit__name", query), 0.0),
                sim_country=Coalesce(TrigramSimilarity("country__name", query), 0.0),
            )
            .annotate(max_sim=Greatest("sim_tender", "sim_note", "sim_customer", "sim_country"))
            .filter(max_sim__gt=0.2)
            .order_by("-max_sim")[:10]
        )

        suggestions = []
        seen_texts = set()
        
        for o in similar_orders:
            # Pick the text that actually matched best
            suggestion_text = ""
            if o.sim_tender == o.max_sim:
                suggestion_text = o.tender_number
            elif o.sim_customer == o.max_sim:
                suggestion_text = o.customer_org_unit.name if o.customer_org_unit else ""
            elif o.sim_country == o.max_sim:
                suggestion_text = o.country.name if o.country else ""
            elif o.sim_note == o.max_sim:
                # For notes, just suggest the order number as context
                suggestion_text = f"Заказ #{o.order_number}"

            if suggestion_text and suggestion_text not in seen_texts:
                suggestions.append({
                    "text": suggestion_text,
                    "order_number": o.order_number,
                    "similarity": o.max_sim,
                })
                seen_texts.add(suggestion_text)
                
        return Response(suggestions[:5])

    @action(detail=False, methods=["get"], url_path="next-number")
    def next_number(self, request):
        return Response({"next_number": get_next_order_number()})

    @action(detail=False, methods=["get"], url_path="missing-numbers")
    def missing_numbers(self, request):
        """Find gaps in order number sequence."""
        numbers = set(
            Order.objects.values_list("order_number", flat=True)
        )
        if not numbers:
            return Response({"missing_formatted": [], "total": 0})

        max_num = max(numbers)
        all_numbers = set(range(1, max_num + 1))
        missing = sorted(all_numbers - numbers)

        # Group into ranges
        formatted = []
        if missing:
            start = missing[0]
            end = missing[0]
            for n in missing[1:]:
                if n == end + 1:
                    end = n
                else:
                    formatted.append(f"{start}-{end}" if start != end else str(start))
                    start = end = n
            formatted.append(f"{start}-{end}" if start != end else str(start))

        return Response({
            "missing_formatted": formatted,
            "total": len(missing),
        })

    @action(detail=True, methods=["get"])
    def history(self, request, order_number=None):
        order = self.get_object()
        history = order.history.all()[:50]
        data = []
        for h in history:
            changes = []
            if h.prev_record:
                diff = h.diff_against(h.prev_record)
                for c in diff.changes:
                    changes.append(_format_change(c))
            data.append({
                "id": h.history_id,
                "date": h.history_date,
                "user": str(h.history_user) if h.history_user else None,
                "type": h.history_type,
                "changes": changes,
            })
        return Response(data)

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-files",
        parser_classes=[parsers.MultiPartParser],
    )
    def upload_files(self, request, order_number=None):
        order = self.get_object()
        files = request.FILES.getlist("files")
        category = request.data.get("category", "general")
        description = request.data.get("description", "")
        created = []
        for f in files:
            order_file = OrderFile.objects.create(
                order=order,
                file=f,
                original_name=f.name,
                file_size=f.size,
                category=category,
                description=description,
            )
            created.append(order_file)
        serializer = OrderFileSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def files(self, request, order_number=None):
        order = self.get_object()
        qs = order.files.all()
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        serializer = OrderFileSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path=r"files/(?P<file_id>\d+)")
    def update_file(self, request, order_number=None, file_id=None):
        order = self.get_object()
        order_file = order.files.filter(id=file_id).first()
        if not order_file:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = OrderFileSerializer(order_file, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path=r"files/(?P<file_id>\d+)/delete")
    def delete_file(self, request, order_number=None, file_id=None):
        order = self.get_object()
        order.files.filter(id=file_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "patch"])
    def contract(self, request, order_number=None):
        order = self.get_object()
        if request.method == "GET":
            try:
                contract = order.contract
            except Contract.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
            serializer = ContractSerializer(contract)
            return Response(serializer.data)

        # PATCH
        try:
            contract = order.contract
            serializer = ContractSerializer(contract, data=request.data, partial=True)
        except Contract.DoesNotExist:
            serializer = ContractSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        serializer.save(order=order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="generate-document")
    def generate_document(self, request, order_number=None):
        """Generate a DOCX document from a template for this order."""
        from django.http import HttpResponse

        order = self.get_object()
        serializer = GenerateDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template = DocumentTemplate.objects.get(pk=serializer.validated_data["template_id"])
        extra_data = serializer.validated_data.get("extra_data", {})

        buf = generate_document(order, template, extra_data)
        filename = f"{template.name}_{order.order_number}.docx"
        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


    # ── Shipment batches ──────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="shipments")
    def shipments(self, request, order_number=None):
        order = self.get_object()
        if request.method == "GET":
            batches = order.shipment_batches.all()
            return Response(ShipmentBatchSerializer(batches, many=True).data)

        # POST: create new batch
        next_num = (order.shipment_batches.aggregate(
            m=db_models.Max("batch_number"))["m"] or 0) + 1
        serializer = ShipmentBatchSerializer(data={**request.data, "batch_number": next_num})
        serializer.is_valid(raise_exception=True)
        serializer.save(order=order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"shipments/(?P<batch_id>\d+)")
    def shipment_detail(self, request, order_number=None, batch_id=None):
        order = self.get_object()
        batch = order.shipment_batches.filter(id=batch_id).first()
        if not batch:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            batch.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ShipmentBatchSerializer(batch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DocumentTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve document templates."""

    queryset = DocumentTemplate.objects.filter(is_active=True)
    serializer_class = DocumentTemplateSerializer
    search_fields = ["name"]
    filterset_fields = ["entity", "document_type"]
