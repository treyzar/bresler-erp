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
        "orderorgunit_set__org_unit",
        "orderpq_set__pq",
    )
    filterset_class = OrderFilter
    search_fields = ["order_number", "tender_number", "note"]
    ordering_fields = ["order_number", "start_date", "ship_date", "status", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        if self.action in ("create", "update", "partial_update"):
            return OrderCreateSerializer
        return OrderDetailSerializer

    @action(detail=False, methods=["get"], url_path="next-number")
    def next_number(self, request):
        return Response({"next_number": get_next_order_number()})

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
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
    def upload_files(self, request, pk=None):
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
    def files(self, request, pk=None):
        order = self.get_object()
        serializer = OrderFileSerializer(order.files.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path=r"files/(?P<file_id>\d+)")
    def delete_file(self, request, pk=None, file_id=None):
        order = self.get_object()
        order.files.filter(id=file_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "patch"])
    def contract(self, request, pk=None):
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
