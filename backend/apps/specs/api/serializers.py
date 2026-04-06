from rest_framework import serializers

from apps.specs.models import (
    CalculationLine,
    CommercialOffer,
    OfferCalculation,
    OfferWorkItem,
    ParticipantContact,
    Specification,
    SpecificationLine,
)


class OfferWorkItemSerializer(serializers.ModelSerializer):
    work_type_name = serializers.CharField(source="work_type.name", read_only=True)

    class Meta:
        model = OfferWorkItem
        fields = (
            "id", "work_type", "work_type_name",
            "included", "days", "specialists", "trips",
        )


class SpecificationLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)
    device_rza_name = serializers.CharField(source="device_rza.rza_name", read_only=True, default=None)
    mod_rza_name = serializers.CharField(source="mod_rza.mod_name", read_only=True, default=None)

    class Meta:
        model = SpecificationLine
        fields = (
            "id", "line_number", "product", "product_name",
            "device_rza", "device_rza_name", "mod_rza", "mod_rza_name",
            "name", "quantity",
            "unit_price", "total_price", "delivery_date", "note",
        )
        read_only_fields = ("id", "total_price")


class SpecificationSerializer(serializers.ModelSerializer):
    lines = SpecificationLineSerializer(many=True, read_only=True)

    class Meta:
        model = Specification
        fields = (
            "id", "total_amount", "total_amount_with_vat", "lines",
        )
        read_only_fields = ("id", "total_amount", "total_amount_with_vat")


class CommercialOfferListSerializer(serializers.ModelSerializer):
    participant_name = serializers.CharField(
        source="participant.org_unit.name", read_only=True,
    )
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = CommercialOffer
        fields = (
            "id", "offer_number", "version", "status", "date",
            "valid_until", "participant", "participant_name",
            "manager", "manager_name", "vat_rate",
            "payment_terms", "total_amount",
        )

    def get_manager_name(self, obj) -> str:
        return obj.manager.get_full_name() if obj.manager else ""

    total_amount = serializers.SerializerMethodField()

    def get_total_amount(self, obj):
        try:
            return obj.specification.total_amount_with_vat
        except Specification.DoesNotExist:
            return None


class CommercialOfferDetailSerializer(serializers.ModelSerializer):
    participant_name = serializers.CharField(
        source="participant.org_unit.name", read_only=True,
    )
    manager_name = serializers.SerializerMethodField()
    executor_name = serializers.SerializerMethodField()
    work_items = OfferWorkItemSerializer(many=True, read_only=True)
    specification = SpecificationSerializer(read_only=True)
    shipment_condition_text = serializers.CharField(read_only=True)
    based_on_number = serializers.CharField(
        source="based_on.offer_number", read_only=True, default=None,
    )

    class Meta:
        model = CommercialOffer
        fields = (
            "id", "offer_number", "version", "status", "date",
            "valid_days", "valid_until",
            "order", "participant", "participant_name",
            "manager", "manager_name", "executor", "executor_name",
            "based_on", "based_on_number",
            "vat_rate", "payment_terms",
            "advance_percent", "pre_shipment_percent", "post_payment_percent",
            "manufacturing_period", "warranty_months",
            "delivery_included", "delivery_city",
            "additional_conditions", "is_template",
            "shipment_condition_text",
            "work_items", "specification",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "offer_number", "version", "valid_until",
            "shipment_condition_text", "created_at", "updated_at",
        )

    def get_manager_name(self, obj) -> str:
        return obj.manager.get_full_name() if obj.manager else ""

    def get_executor_name(self, obj) -> str:
        return obj.executor.get_full_name() if obj.executor else ""


class CommercialOfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommercialOffer
        fields = (
            "participant", "date", "valid_days",
            "manager", "executor",
            "vat_rate", "payment_terms",
            "advance_percent", "pre_shipment_percent", "post_payment_percent",
            "manufacturing_period", "warranty_months",
            "delivery_included", "delivery_city",
            "additional_conditions",
        )


class ParticipantContactSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = ParticipantContact
        fields = ("id", "participant", "contact", "contact_name", "is_primary")
        read_only_fields = ("id",)


class SpecificationFillSerializer(serializers.Serializer):
    """Serializer for fill specification from products or another offer."""
    source_type = serializers.ChoiceField(choices=["products", "offer"])
    product_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[],
    )
    source_offer_id = serializers.IntegerField(required=False)


class CalculationLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)
    device_rza_name = serializers.CharField(source="device_rza.rza_name", read_only=True, default=None)
    mod_rza_name = serializers.CharField(source="mod_rza.mod_name", read_only=True, default=None)

    class Meta:
        model = CalculationLine
        fields = (
            "id", "line_number", "product", "product_name",
            "device_rza", "device_rza_name", "mod_rza", "mod_rza_name",
            "name", "quantity",
            "base_price", "overhead_type", "overhead_percent",
            "price_with_overhead", "project_coeff", "estimated_price",
            "discount_coeff", "discounted_price", "total_price", "note",
        )
        read_only_fields = ("id", "price_with_overhead", "estimated_price", "discounted_price", "total_price")


class OfferCalculationSerializer(serializers.ModelSerializer):
    lines = CalculationLineSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = OfferCalculation
        fields = (
            "id", "default_overhead_percent", "default_project_coeff",
            "default_discount_coeff", "note", "lines", "total",
        )
        read_only_fields = ("id",)

    def get_total(self, obj) -> dict:
        lines = obj.lines.all()
        total_base = sum(l.base_price * l.quantity for l in lines)
        total_estimated = sum(l.estimated_price * l.quantity for l in lines)
        total_discounted = sum(l.total_price for l in lines)
        return {
            "base": str(total_base),
            "estimated": str(total_estimated),
            "discounted": str(total_discounted),
        }
