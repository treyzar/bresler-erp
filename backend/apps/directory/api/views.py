from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.directory.models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)

from .filters import ContactFilter, FacilityFilter, OrgUnitFilter
from .serializers import (
    CitySerializer,
    ContactSerializer,
    CountrySerializer,
    DeliveryTypeSerializer,
    EquipmentSerializer,
    FacilitySerializer,
    OrgUnitSerializer,
    OrgUnitTreeSerializer,
    TypeOfWorkSerializer,
)


class OrgUnitViewSet(viewsets.ModelViewSet):
    queryset = OrgUnit.objects.all()
    serializer_class = OrgUnitSerializer
    filterset_class = OrgUnitFilter
    search_fields = ["name", "full_name", "inn", "external_code"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            # Filter parameters that should trigger a global search (ignoring depth)
            filter_params = ["search", "unit_type", "business_role", "country", "is_active"]
            if any(self.request.query_params.get(p) for p in filter_params):
                return qs

            # Return root nodes by default if no parent is specified
            parent = self.request.query_params.get("parent")
            if parent is None:
                return qs.filter(depth=1)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent_id = request.data.get("parent")
        if parent_id:
            parent = OrgUnit.objects.get(pk=parent_id)
            instance = parent.add_child(**serializer.validated_data)
        else:
            instance = OrgUnit.add_root(**serializer.validated_data)

        output_serializer = self.get_serializer(instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        node = self.get_object()
        children = node.get_children()
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def ancestors(self, request, pk=None):
        node = self.get_object()
        ancestors = node.get_ancestors()
        serializer = self.get_serializer(ancestors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def tree(self, request):
        roots = OrgUnit.get_root_nodes()
        serializer = OrgUnitTreeSerializer(roots, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="facilities-by-orgunits")
    def facilities_by_orgunits(self, request):
        """Get Facility objects linked to given OrgUnit IDs and their descendants."""
        from apps.directory.models import Facility

        ids = request.query_params.getlist("ids")
        if not ids:
            return Response([])
        all_orgunit_ids = set()
        for uid in ids:
            try:
                node = OrgUnit.objects.get(pk=uid)
            except OrgUnit.DoesNotExist:
                continue
            all_orgunit_ids.add(node.pk)
            for desc in node.get_descendants():
                all_orgunit_ids.add(desc.pk)
        facilities = Facility.objects.filter(
            org_unit_id__in=all_orgunit_ids, is_active=True
        ).select_related("org_unit")
        data = [
            {"id": f.id, "name": f.name, "org_unit_name": f.org_unit.name if f.org_unit else ""}
            for f in facilities
        ]
        return Response(data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "")
        if not query:
            return Response([])
        qs = OrgUnit.objects.filter(name__icontains=query)[:20]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    search_fields = ["name", "code"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = Country.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.select_related("country").all()
    serializer_class = CitySerializer
    search_fields = ["name"]
    filterset_fields = ["country"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = City.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_class = ContactFilter
    search_fields = ["full_name", "email", "phone"]

    @action(detail=True, methods=["get"])
    def orgunits(self, request, pk=None):
        contact = self.get_object()
        org_units = contact.org_units.all()
        serializer = OrgUnitSerializer(org_units, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = Contact.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    search_fields = ["name"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = Equipment.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class TypeOfWorkViewSet(viewsets.ModelViewSet):
    queryset = TypeOfWork.objects.all()
    serializer_class = TypeOfWorkSerializer
    search_fields = ["name"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = TypeOfWork.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class DeliveryTypeViewSet(viewsets.ModelViewSet):
    queryset = DeliveryType.objects.all()
    serializer_class = DeliveryTypeSerializer
    search_fields = ["name"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = DeliveryType.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class FacilityViewSet(viewsets.ModelViewSet):
    queryset = Facility.objects.select_related("org_unit").all()
    serializer_class = FacilitySerializer
    filterset_class = FacilityFilter
    search_fields = ["name", "address"]

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = Facility.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})
