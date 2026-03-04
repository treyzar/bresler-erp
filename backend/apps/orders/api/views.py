from django.contrib.postgres.search import TrigramSimilarity
from django.db.models.functions import Coalesce, Greatest
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.orders.models import Contract, Order, OrderFile
from apps.orders.services.order_service import get_next_order_number

from .filters import OrderFilter
from .serializers import (
    ContractSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderFileSerializer,
    OrderListSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):
    lookup_field = "order_number"
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

    @action(detail=True, methods=["get"])
    def history(self, request, order_number=None):
        order = self.get_object()
        history = order.history.all()[:50]
        data = [
            {
                "id": h.history_id,
                "date": h.history_date,
                "user": str(h.history_user) if h.history_user else None,
                "type": h.history_type,
                "changes": h.diff_against(h.prev_record).changes if h.prev_record else [],
            }
            for h in history
        ]
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
        created = []
        for f in files:
            order_file = OrderFile.objects.create(
                order=order,
                file=f,
                original_name=f.name,
                file_size=f.size,
            )
            created.append(order_file)
        serializer = OrderFileSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def files(self, request, order_number=None):
        order = self.get_object()
        serializer = OrderFileSerializer(order.files.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path=r"files/(?P<file_id>\d+)")
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
