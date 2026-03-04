from rest_framework import serializers

from apps.orders.models import Contract, Order, OrderFile, OrderOrgUnit, OrderParticipant


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
        fields = ("id", "file", "original_name", "file_size", "created_at")
        read_only_fields = ("id", "file_size", "created_at")


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = (
            "id",
            "contract_number",
            "contract_date",
            "status",
            "advance_percent",
            "intermediate_percent",
            "post_payment_percent",
            "amount",
            "deadline_days",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order lists with enhanced info."""

    customer_name = serializers.CharField(
        source="customer_org_unit.name",
        read_only=True,
        default="",
    )
    country_name = serializers.CharField(
        source="country.name",
        read_only=True,
        default="",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    branch_name = serializers.SerializerMethodField()
    division_name = serializers.SerializerMethodField()
    facility_names = serializers.SerializerMethodField()
    equipment_names = serializers.SerializerMethodField()
    work_names = serializers.SerializerMethodField()
    participant_names = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "tender_number",
            "status",
            "status_display",
            "country_name",
            "customer_name",
            "branch_name",
            "division_name",
            "facility_names",
            "equipment_names",
            "work_names",
            "participant_names",
            "start_date",
            "ship_date",
            "note",
            "created_at",
        )

    def get_branch_name(self, obj):
        for ou in obj.org_units.all():
            if ou.unit_type == "branch":
                return ou.name
        return ""

    def get_division_name(self, obj):
        for ou in obj.org_units.all():
            if ou.unit_type == "division":
                return ou.name
        return ""

    def get_facility_names(self, obj):
        return ", ".join(ou.name for ou in obj.org_units.all() if ou.unit_type == "site")

    def get_equipment_names(self, obj):
        return ", ".join(e.name for e in obj.equipments.all())

    def get_work_names(self, obj):
        return ", ".join(w.name for w in obj.works.all())

    def get_participant_names(self, obj):
        return ", ".join(p.name for p in obj.participants.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full serializer for order detail view."""

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
    manager_ids = serializers.PrimaryKeyRelatedField(
        source="managers",
        many=True,
        read_only=True,
    )
    contact_ids = serializers.PrimaryKeyRelatedField(
        source="contacts",
        many=True,
        read_only=True,
    )
    equipment_ids = serializers.PrimaryKeyRelatedField(
        source="equipments",
        many=True,
        read_only=True,
    )
    work_ids = serializers.PrimaryKeyRelatedField(
        source="works",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
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
            "contract",
            "order_org_units",
            "order_participants",
            "files",
            "manager_ids",
            "contact_ids",
            "equipment_ids",
            "work_ids",
            "related_orders",
            "created_at",
            "updated_at",
        )


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating orders."""

    class Meta:
        model = Order
        fields = (
            "order_number",
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
            "related_orders",
        )
