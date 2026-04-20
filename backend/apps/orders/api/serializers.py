from rest_framework import serializers

from apps.orders.models import Contract, DocumentTemplate, Order, OrderFile, OrderOrgUnit, OrderParticipant, ShipmentBatch


class OrderOrgUnitSerializer(serializers.ModelSerializer):
    org_unit_name = serializers.CharField(source="org_unit.name", read_only=True)

    class Meta:
        model = OrderOrgUnit
        fields = ("id", "org_unit", "org_unit_name", "role", "order_index", "note")


class OrderParticipantSerializer(serializers.ModelSerializer):
    org_unit_name = serializers.CharField(source="org_unit.name", read_only=True)

    class Meta:
        model = OrderParticipant
        fields = ("id", "org_unit", "org_unit_name", "order_index")


class OrderFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderFile
        fields = ("id", "file", "original_name", "file_size", "category", "description", "created_at")
        read_only_fields = ("id", "file_size", "created_at")


class ContractSerializer(serializers.ModelSerializer):
    # contract_number is auto-generated via NamingSeries if left blank
    contract_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Contract
        fields = (
            "id",
            "contract_number",
            "contract_date",
            "status",
            "payment_template",
            "advance_percent",
            "intermediate_percent",
            "post_payment_percent",
            "amount",
            "deadline_days",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class DocumentTemplateSerializer(serializers.ModelSerializer):
    entity_display = serializers.CharField(source="get_entity_display", read_only=True)
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)

    class Meta:
        model = DocumentTemplate
        fields = (
            "id", "name", "document_type", "document_type_display",
            "entity", "entity_display", "template_file",
            "description", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class GenerateDocumentSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    extra_data = serializers.DictField(required=False, default=dict)


class ShipmentBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentBatch
        fields = ("id", "batch_number", "ship_date", "description", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order lists with enhanced info."""

    customer_name = serializers.SerializerMethodField()
    customer_path = serializers.SerializerMethodField()
    country_name = serializers.CharField(
        source="country.name",
        read_only=True,
        default="",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    branch_name = serializers.SerializerMethodField()
    branch_path = serializers.SerializerMethodField()
    division_name = serializers.SerializerMethodField()
    division_path = serializers.SerializerMethodField()
    facility_names = serializers.SerializerMethodField()
    equipment_names = serializers.SerializerMethodField()
    work_names = serializers.SerializerMethodField()
    participant_names = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "order_type",
            "tender_number",
            "status",
            "status_display",
            "country_name",
            "customer_name",
            "customer_path",
            "branch_name",
            "branch_path",
            "division_name",
            "division_path",
            "facility_names",
            "equipment_names",
            "work_names",
            "participant_names",
            "start_date",
            "ship_date",
            "note",
            "created_at",
        )

    def _customer(self, obj):
        """Resolve the customer OrgUnit — FK wins; legacy flows may use OrderOrgUnit(role=customer)."""
        if obj.customer_org_unit_id:
            return obj.customer_org_unit
        link = obj.orderorgunit_set.select_related("org_unit").filter(role="customer").first()
        return link.org_unit if link else None

    def _customer_chain(self, obj):
        """Return [ancestors..., customer] as a list, cached per-object."""
        cached = getattr(obj, "_customer_chain_cache", None)
        if cached is not None:
            return cached
        customer = self._customer(obj)
        if customer is None:
            chain: list = []
        else:
            try:
                chain = [*customer.get_ancestors(), customer]
            except Exception:
                chain = [customer]
        obj._customer_chain_cache = chain
        return chain

    @staticmethod
    def _find_by_type(chain, unit_type):
        for ou in chain:
            if ou.unit_type == unit_type:
                return ou
        return None

    def _breadcrumb(self, org_unit):
        if not org_unit:
            return ""
        try:
            chain = [*org_unit.get_ancestors(), org_unit]
        except Exception:
            chain = [org_unit]
        return " › ".join(ou.name for ou in chain)

    def get_customer_name(self, obj):
        chain = self._customer_chain(obj)
        # Prefer the company-level node; if none exists, fall back to the top of the chain
        ou = self._find_by_type(chain, "company") or (chain[0] if chain else None)
        return ou.name if ou else ""

    def get_customer_path(self, obj):
        chain = self._customer_chain(obj)
        ou = self._find_by_type(chain, "company") or (chain[0] if chain else None)
        return self._breadcrumb(ou)

    def get_branch_name(self, obj):
        ou = self._find_by_type(self._customer_chain(obj), "branch")
        return ou.name if ou else ""

    def get_branch_path(self, obj):
        ou = self._find_by_type(self._customer_chain(obj), "branch")
        return self._breadcrumb(ou)

    def get_division_name(self, obj):
        ou = self._find_by_type(self._customer_chain(obj), "division")
        return ou.name if ou else ""

    def get_division_path(self, obj):
        ou = self._find_by_type(self._customer_chain(obj), "division")
        return self._breadcrumb(ou)

    def get_facility_names(self, obj):
        return ", ".join(f.name for f in obj.facilities.all())

    def get_equipment_names(self, obj):
        return ", ".join(e.name for e in obj.equipments.all())

    def get_work_names(self, obj):
        return ", ".join(w.name for w in obj.works.all())

    def get_participant_names(self, obj):
        return ", ".join(p.name for p in obj.participants.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full serializer for order detail view."""

    related_orders = serializers.SlugRelatedField(
        slug_field="order_number",
        read_only=True,
        many=True,
    )

    customer_name = serializers.CharField(
        source="customer_org_unit.name",
        read_only=True,
        default="",
    )
    intermediary_name = serializers.CharField(
        source="intermediary.name",
        read_only=True,
        default="",
    )
    designer_name = serializers.CharField(
        source="designer.name",
        read_only=True,
        default="",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    contract = ContractSerializer(read_only=True)
    order_org_units = OrderOrgUnitSerializer(
        source="orderorgunit_set",
        many=True,
        read_only=True,
    )
    order_participants = OrderParticipantSerializer(
        source="orderparticipant_set",
        many=True,
        read_only=True,
    )
    files = OrderFileSerializer(many=True, read_only=True)
    shipment_batches = ShipmentBatchSerializer(many=True, read_only=True)
    manager_ids = serializers.PrimaryKeyRelatedField(
        source="managers",
        many=True,
        read_only=True,
    )
    manager_names = serializers.SerializerMethodField()
    contact_ids = serializers.PrimaryKeyRelatedField(
        source="contacts",
        many=True,
        read_only=True,
    )
    contact_names = serializers.SerializerMethodField()
    equipment_ids = serializers.PrimaryKeyRelatedField(
        source="equipments",
        many=True,
        read_only=True,
    )
    equipment_names = serializers.SerializerMethodField()
    work_ids = serializers.PrimaryKeyRelatedField(
        source="works",
        many=True,
        read_only=True,
    )
    work_names = serializers.SerializerMethodField()
    facility_ids = serializers.PrimaryKeyRelatedField(
        source="facilities",
        many=True,
        read_only=True,
    )
    facility_names = serializers.SerializerMethodField()
    country_name = serializers.CharField(
        source="country.name",
        read_only=True,
        default="",
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "order_type",
            "tender_number",
            "status",
            "status_display",
            "note",
            "start_date",
            "ship_date",
            "customer_org_unit",
            "customer_name",
            "intermediary",
            "intermediary_name",
            "designer",
            "designer_name",
            "country",
            "country_name",
            "contract",
            "order_org_units",
            "order_participants",
            "files",
            "shipment_batches",
            "manager_ids",
            "manager_names",
            "contact_ids",
            "contact_names",
            "equipment_ids",
            "equipment_names",
            "work_ids",
            "work_names",
            "facility_ids",
            "facility_names",
            "related_orders",
            "created_at",
            "updated_at",
        )

    def get_manager_names(self, obj):
        return [
            {"id": u.id, "name": u.get_full_name() or u.username}
            for u in obj.managers.all()
        ]

    def get_contact_names(self, obj):
        return [
            {"id": c.id, "name": c.full_name}
            for c in obj.contacts.all()
        ]

    def get_equipment_names(self, obj):
        return [{"id": e.id, "name": e.name} for e in obj.equipments.all()]

    def get_work_names(self, obj):
        return [{"id": w.id, "name": w.name} for w in obj.works.all()]

    def get_facility_names(self, obj):
        return [
            {"id": f.id, "name": f.name, "org_unit_name": f.org_unit.name if f.org_unit else ""}
            for f in obj.facilities.select_related("org_unit").all()
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating orders."""

    related_orders = serializers.SlugRelatedField(
        slug_field="order_number",
        queryset=Order.objects.all(),
        many=True,
        required=False,
    )

    org_units_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=[],
    )
    participants_data = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "order_number",
            "order_type",
            "tender_number",
            "status",
            "note",
            "start_date",
            "ship_date",
            "customer_org_unit",
            "intermediary",
            "designer",
            "country",
            "contacts",
            "managers",
            "equipments",
            "works",
            "facilities",
            "related_orders",
            "org_units_data",
            "participants_data",
        )

    def create(self, validated_data):
        org_units_data = validated_data.pop("org_units_data", [])
        participants_data = validated_data.pop("participants_data", [])
        order = super().create(validated_data)
        self._save_org_units(order, org_units_data)
        self._save_participants(order, participants_data)
        return order

    def update(self, instance, validated_data):
        org_units_data = validated_data.pop("org_units_data", None)
        participants_data = validated_data.pop("participants_data", None)
        order = super().update(instance, validated_data)
        if org_units_data is not None:
            self._save_org_units(order, org_units_data)
        if participants_data is not None:
            self._save_participants(order, participants_data)
        return order

    @staticmethod
    def _save_org_units(order, org_units_data):
        order.orderorgunit_set.all().delete()
        for i, entry in enumerate(org_units_data):
            OrderOrgUnit.objects.create(
                order=order,
                org_unit_id=entry["org_unit"],
                role=entry.get("role", ""),
                order_index=i,
            )

    @staticmethod
    def _save_participants(order, participants_data):
        order.orderparticipant_set.all().delete()
        for i, entry in enumerate(participants_data):
            OrderParticipant.objects.create(
                order=order,
                org_unit_id=entry["org_unit"],
                order_index=i + 1,
            )
