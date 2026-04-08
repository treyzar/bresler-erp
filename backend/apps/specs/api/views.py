from django.db import models
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order, OrderParticipant
from apps.specs.models import (
    CalculationLine,
    CommercialOffer,
    OfferCalculation,
    OfferWorkItem,
    ParticipantContact,
    Specification,
    SpecificationLine,
)
from apps.specs.services import offer_service, specification_service, document_service

from .filters import CommercialOfferFilter
from .serializers import (
    CalculationLineSerializer,
    CommercialOfferCreateSerializer,
    CommercialOfferDetailSerializer,
    CommercialOfferListSerializer,
    OfferCalculationSerializer,
    OfferWorkItemSerializer,
    ParticipantContactSerializer,
    SpecificationFillSerializer,
    SpecificationLineSerializer,
    SpecificationSerializer,
)


class CommercialOfferViewSet(viewsets.ModelViewSet):
    """CRUD for CommercialOffer, scoped to an order."""

    permission_classes = [IsAuthenticated]
    filterset_class = CommercialOfferFilter
    search_fields = ["offer_number"]
    ordering_fields = ["date", "version", "created_at"]
    ordering = ["-date", "-version"]

    def get_queryset(self):
        qs = CommercialOffer.objects.select_related(
            "participant__org_unit", "manager", "executor", "based_on",
        ).prefetch_related("work_items__work_type")

        # Scope to order if nested under /api/orders/{order_pk}/offers/
        order_pk = self.kwargs.get("order_pk")
        if order_pk:
            qs = qs.filter(order_id=order_pk)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CommercialOfferListSerializer
        if self.action == "create":
            return CommercialOfferCreateSerializer
        return CommercialOfferDetailSerializer

    def perform_create(self, serializer):
        order_pk = self.kwargs.get("order_pk")
        order = Order.objects.prefetch_related("managers").get(pk=order_pk)
        participant = serializer.validated_data.pop("participant")

        # Manager defaults to order's first manager, not the creating user
        if "manager" not in serializer.validated_data or not serializer.validated_data.get("manager"):
            order_manager = order.managers.first()
            if order_manager:
                serializer.validated_data["manager"] = order_manager

        offer = offer_service.create_offer(
            order=order,
            participant=participant,
            user=self.request.user,
            **serializer.validated_data,
        )
        serializer.instance = offer

    @action(detail=True, methods=["post"])
    def copy(self, request, **kwargs):
        """Create a new offer based on this one ('Заполнить на основании')."""
        source = self.get_object()
        participant_id = request.data.get("participant_id", source.participant_id)
        participant = OrderParticipant.objects.get(pk=participant_id)

        offer = offer_service.create_from_template(source, participant, request.user)
        serializer = CommercialOfferDetailSerializer(offer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Nested: work items ────────────────────────────────────────

    @action(detail=True, methods=["get", "patch"])
    def works(self, request, **kwargs):
        offer = self.get_object()
        if request.method == "GET":
            # Auto-populate work items from order's works if none exist
            if not offer.work_items.exists():
                for wt in offer.order.works.all():
                    OfferWorkItem.objects.get_or_create(
                        offer=offer, work_type=wt,
                        defaults={"included": True},
                    )
            items = offer.work_items.select_related("work_type").all()
            return Response(OfferWorkItemSerializer(items, many=True).data)

        # PATCH: bulk update work items
        for item_data in request.data:
            item_id = item_data.get("id")
            if item_id:
                offer.work_items.filter(id=item_id).update(**{
                    k: v for k, v in item_data.items() if k != "id"
                })
        items = offer.work_items.select_related("work_type").all()
        return Response(OfferWorkItemSerializer(items, many=True).data)

    # ── Nested: specification ────────────────────────────────────

    @action(detail=True, methods=["get", "patch"], url_path="specification")
    def specification(self, request, **kwargs):
        offer = self.get_object()
        spec, _ = Specification.objects.get_or_create(offer=offer)

        if request.method == "GET":
            return Response(SpecificationSerializer(spec).data)

        # PATCH: update lines
        lines_data = request.data.get("lines", [])
        # Remove lines not in request
        incoming_ids = {l.get("id") for l in lines_data if l.get("id")}
        spec.lines.exclude(id__in=incoming_ids).delete()

        readonly_fields = {"id", "total_price", "product_name"}
        for line_data in lines_data:
            line_id = line_data.pop("id", None)
            for rf in readonly_fields:
                line_data.pop(rf, None)
            if line_id:
                SpecificationLine.objects.filter(
                    id=line_id, specification=spec,
                ).update(**line_data)
                # Re-save to trigger total_price calculation
                for line in SpecificationLine.objects.filter(id=line_id):
                    line.save()
            else:
                SpecificationLine.objects.create(specification=spec, **line_data)

        spec.recalculate()
        return Response(SpecificationSerializer(spec).data)

    @action(detail=True, methods=["post"], url_path="specification/fill")
    def specification_fill(self, request, **kwargs):
        """Fill specification from products catalog or another offer."""
        offer = self.get_object()
        spec, _ = Specification.objects.get_or_create(offer=offer)

        serializer = SpecificationFillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["source_type"] == "products":
            specification_service.fill_from_products(
                spec, serializer.validated_data["product_ids"],
            )
        elif serializer.validated_data["source_type"] == "offer":
            source_offer = CommercialOffer.objects.get(
                pk=serializer.validated_data["source_offer_id"],
            )
            specification_service.fill_from_offer(spec, source_offer)

        return Response(SpecificationSerializer(spec).data)

    # ── Calculation (расчёт) ───────────────────────────────────

    @action(detail=True, methods=["get", "patch"], url_path="calculation")
    def calculation(self, request, **kwargs):
        offer = self.get_object()
        calc, _ = OfferCalculation.objects.get_or_create(offer=offer)

        if request.method == "GET":
            return Response(OfferCalculationSerializer(calc).data)

        # PATCH: update defaults + lines
        # Update defaults
        for field in ("default_overhead_percent", "default_project_coeff", "default_discount_coeff", "delivery_price", "delivery_pricing_mode", "note"):
            if field in request.data:
                setattr(calc, field, request.data[field])
        calc.save()

        # Update lines if provided
        lines_data = request.data.get("lines")
        if lines_data is not None:
            incoming_ids = {l.get("id") for l in lines_data if l.get("id")}
            calc.lines.exclude(id__in=incoming_ids).delete()

            readonly_fields = {
                "id", "price_with_overhead", "estimated_price",
                "discounted_price", "total_price", "product_name",
                "device_rza_name", "mod_rza_name",
            }
            for line_data in lines_data:
                line_id = line_data.pop("id", None)
                for rf in readonly_fields:
                    line_data.pop(rf, None)
                if line_id:
                    try:
                        line = calc.lines.get(id=line_id)
                        for k, v in line_data.items():
                            setattr(line, k, v)
                        line.save()
                    except CalculationLine.DoesNotExist:
                        CalculationLine.objects.create(calculation=calc, **line_data)
                else:
                    CalculationLine.objects.create(calculation=calc, **line_data)

        return Response(OfferCalculationSerializer(calc).data)

    @action(detail=True, methods=["post"], url_path="calculation/apply-defaults")
    def calculation_apply_defaults(self, request, **kwargs):
        """Apply default coefficients to all lines."""
        offer = self.get_object()
        calc, _ = OfferCalculation.objects.get_or_create(offer=offer)

        for line in calc.lines.all():
            line.overhead_percent = calc.default_overhead_percent
            line.project_coeff = calc.default_project_coeff
            line.discount_coeff = calc.default_discount_coeff
            line.save()

        return Response(OfferCalculationSerializer(calc).data)

    @action(detail=True, methods=["post"], url_path="calculation/to-specification")
    def calculation_to_specification(self, request, **kwargs):
        """Fill specification from calculation results."""
        offer = self.get_object()
        calc = offer.calculation
        spec, _ = Specification.objects.get_or_create(offer=offer)

        # Clear existing spec lines
        spec.lines.all().delete()

        # Main calc lines
        line_num = 0
        for cl in calc.lines.all():
            line_num += 1
            SpecificationLine.objects.create(
                specification=spec,
                line_number=line_num,
                product=cl.product,
                device_rza=cl.device_rza,
                mod_rza=cl.mod_rza,
                name=cl.name,
                quantity=cl.quantity,
                unit_price=cl.discounted_price,
                delivery_date=None,
                note=cl.note,
            )

        # Delivery as separate line (if enabled and separate mode)
        if offer.delivery_included and float(calc.delivery_price) > 0 and calc.delivery_pricing_mode == "separate":
            line_num += 1
            city = f" до {offer.delivery_city}" if offer.delivery_city else ""
            SpecificationLine.objects.create(
                specification=spec,
                line_number=line_num,
                name=f"Доставка{city}",
                quantity=1,
                unit_price=calc.delivery_price,
            )

        # Works as separate lines (included work items with prices in separate mode)
        for wi in offer.work_items.filter(included=True, unit_price__gt=0, pricing_mode="separate"):
            line_num += 1
            SpecificationLine.objects.create(
                specification=spec,
                line_number=line_num,
                name=wi.work_type.name,
                quantity=1,
                unit_price=wi.unit_price,
            )

        spec.recalculate()
        return Response(SpecificationSerializer(spec).data)

    @action(detail=True, methods=["post"], url_path="calculation/add-parameters")
    def calculation_add_parameters(self, request, **kwargs):
        """Add device/mod parameters as optional lines to calculation."""
        from apps.devices.models.junctions import DeviceRZAParameter, ModRZAParameter

        offer = self.get_object()
        calc, _ = OfferCalculation.objects.get_or_create(offer=offer)
        device_rza_id = request.data.get("device_rza_id")
        mod_rza_id = request.data.get("mod_rza_id")
        parent_line_id = request.data.get("parent_line_id")
        pricing_mode = request.data.get("pricing_mode", "separate")

        params = []
        if mod_rza_id:
            params = ModRZAParameter.objects.filter(
                mod_rza_id=mod_rza_id,
            ).select_related("parameter", "mod_rza__device_rza")
        elif device_rza_id:
            params = DeviceRZAParameter.objects.filter(
                device_rza_id=device_rza_id,
            ).select_related("parameter")

        last_num = calc.lines.aggregate(m=models.Max("line_number"))["m"] or 0
        created = []
        for p in params:
            if float(p.price) == 0:
                continue
            last_num += 1
            line = CalculationLine.objects.create(
                calculation=calc,
                line_number=last_num,
                name=p.parameter.name,
                quantity=1,
                base_price=p.price,
                is_optional=True,
                option_type="parameter",
                pricing_mode=pricing_mode,
                parent_line_id=parent_line_id,
                overhead_type="equipment",
                overhead_percent=calc.default_overhead_percent,
                project_coeff=calc.default_project_coeff,
                discount_coeff=calc.default_discount_coeff,
            )
            created.append(line)

        return Response(OfferCalculationSerializer(calc).data)

    # ── DOCX export ──────────────────────────────────────────────

    @action(detail=True, methods=["get"])
    def export(self, request, **kwargs):
        """Export КП as DOCX."""
        offer = self.get_object()
        buf = document_service.generate_offer_docx(offer)
        filename = f"KP_{offer.offer_number.replace('/', '_')}.docx"
        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["get"], url_path="specification/export")
    def specification_export(self, request, **kwargs):
        """Export specification as DOCX."""
        offer = self.get_object()
        buf = document_service.generate_specification_docx(offer)
        filename = f"Spec_{offer.offer_number.replace('/', '_')}.docx"
        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ParticipantContactViewSet(viewsets.ModelViewSet):
    """Manage contacts for a specific OrderParticipant."""

    permission_classes = [IsAuthenticated]
    serializer_class = ParticipantContactSerializer

    def get_queryset(self):
        return ParticipantContact.objects.filter(
            participant_id=self.kwargs["participant_pk"],
        ).select_related("contact")

    def perform_create(self, serializer):
        serializer.save(participant_id=self.kwargs["participant_pk"])
