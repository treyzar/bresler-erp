from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins.export import ExportMixin
from apps.core.mixins.metadata import MetadataMixin

from apps.directory.models import (
    City,
    Contact,
    ContactEmployment,
    Country,
    DeliveryType,
    Department,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)

from .filters import ContactFilter, FacilityFilter, OrgUnitFilter
from .serializers import (
    CitySerializer,
    ContactEmploymentSerializer,
    ContactSerializer,
    CountrySerializer,
    DeliveryTypeSerializer,
    EquipmentSerializer,
    FacilitySerializer,
    OrgUnitSerializer,
    OrgUnitTreeSerializer,
    TypeOfWorkSerializer,
)


class OrgUnitViewSet(MetadataMixin, ExportMixin, viewsets.ModelViewSet):
    queryset = OrgUnit.objects.all()
    serializer_class = OrgUnitSerializer
    filterset_class = OrgUnitFilter
    search_fields = ["name", "full_name", "inn", "external_code"]
    meta_extra = {
        "country": {"widget": "combobox", "endpoint": "/api/directory/countries/"},
    }
    # 'ids' is used by OrgUnitCombobox to resolve pre-selected IDs;
    # 'parent' drives tree breadcrumb navigation — not user filters.
    meta_hidden_filters = ("ids", "parent")
    export_filename = "organizations"
    export_fields = {
        "name": "Наименование",
        "full_name": "Полное наименование",
        "unit_type": "Тип",
        "business_role": "Роль",
        "inn": "ИНН",
        "kpp": "КПП",
        "ogrn": "ОГРН",
        "address": "Адрес",
        "is_active": "Активен",
    }

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


class ContactViewSet(ExportMixin, viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_class = ContactFilter
    search_fields = ["full_name", "email", "phone"]
    export_filename = "contacts"
    export_fields = {
        "full_name": "ФИО",
        "position": "Должность",
        "email": "Email",
        "phone": "Телефон",
        "address": "Адрес",
        "city__name": "Город",
        "company": "Компания",
    }

    @action(detail=True, methods=["get"])
    def orgunits(self, request, pk=None):
        """Current employer + history (via ContactEmployment) of the contact."""
        contact = self.get_object()
        # Current employer (if set) plus historical ones
        ou_ids: list[int] = []
        if contact.org_unit_id:
            ou_ids.append(contact.org_unit_id)
        ou_ids.extend(
            contact.employments.exclude(org_unit_id__in=ou_ids).values_list("org_unit_id", flat=True)
        )
        preserved = {pk_: idx for idx, pk_ in enumerate(ou_ids)}
        org_units = sorted(
            OrgUnit.objects.filter(id__in=ou_ids),
            key=lambda o: preserved.get(o.id, 0),
        )
        serializer = OrgUnitSerializer(org_units, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        deleted, _ = Contact.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})


class ContactEmploymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to contact employment history.

    Records are written automatically by signals when Contact fields
    (position, address, org_unit) change — never edited by users directly.
    """

    queryset = ContactEmployment.objects.select_related("org_unit").all()
    serializer_class = ContactEmploymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        contact_id = self.request.query_params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only справочник подразделений компании (Служба/Отдел/Сектор)."""

    queryset = Department.objects.filter(is_active=True).select_related("company").all()
    search_fields = ["name", "full_name"]

    def get_serializer_class(self):
        from rest_framework import serializers as drf

        class _Serializer(drf.ModelSerializer):
            class Meta:
                model = Department
                fields = ["id", "name", "full_name", "unit_type", "company", "is_active"]

        return _Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        company_id = self.request.query_params.get("company")
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs.order_by("company__name", "name")


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
