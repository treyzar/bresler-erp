from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.links import DocumentLink
from apps.core.naming import NumberSequence

MODEL_MAP = {
    "order": ("orders", "order"),
    "contract": ("orders", "contract"),
    "orgunit": ("directory", "orgunit"),
    "contact": ("directory", "contact"),
    "letter": ("registry", "letter"),
    "facility": ("directory", "facility"),
    # EDO internal_docs: служебки, заявления, командировочные сметы — всё это
    # экземпляры одной модели Document, различаются по DocumentType.
    "document": ("internal_docs", "document"),
}


class DocumentLinkSerializer(serializers.ModelSerializer):
    source_repr = serializers.SerializerMethodField()
    target_repr = serializers.SerializerMethodField()
    source_model = serializers.SerializerMethodField()
    target_model = serializers.SerializerMethodField()

    class Meta:
        model = DocumentLink
        fields = [
            "id", "source_type", "source_id", "source_repr", "source_model",
            "target_type", "target_id", "target_repr", "target_model",
            "link_type", "note", "created_at",
        ]
        read_only_fields = ["id", "source_repr", "target_repr", "source_model", "target_model", "created_at"]

    def get_source_repr(self, obj) -> str:
        return str(obj.source) if obj.source else ""

    def get_target_repr(self, obj) -> str:
        return str(obj.target) if obj.target else ""

    def get_source_model(self, obj) -> str:
        return obj.source_type.model if obj.source_type else ""

    def get_target_model(self, obj) -> str:
        return obj.target_type.model if obj.target_type else ""


class DocumentLinkCreateSerializer(serializers.Serializer):
    source_model = serializers.CharField()
    source_id = serializers.IntegerField()
    target_model = serializers.CharField()
    target_id = serializers.IntegerField()
    link_type = serializers.CharField(required=False, default="related")
    note = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_source_model(self, value):
        return _resolve_content_type(value)

    def validate_target_model(self, value):
        return _resolve_content_type(value)

    def create(self, validated_data):
        return DocumentLink.objects.create(
            source_type=validated_data["source_model"],
            source_id=validated_data["source_id"],
            target_type=validated_data["target_model"],
            target_id=validated_data["target_id"],
            link_type=validated_data.get("link_type", "related"),
            note=validated_data.get("note", ""),
        )


def _resolve_content_type(model_name: str) -> ContentType:
    key = model_name.lower()
    if key not in MODEL_MAP:
        raise serializers.ValidationError(f"Unknown model: {model_name}")
    app_label, model = MODEL_MAP[key]
    try:
        return ContentType.objects.get(app_label=app_label, model=model)
    except ContentType.DoesNotExist:
        raise serializers.ValidationError(f"Model not found: {model_name}")


class DocumentLinkViewSet(ModelViewSet):
    """
    API for linked documents.

    GET /api/links/?source_model=order&source_id=123
    POST /api/links/ {source_model, source_id, target_model, target_id}
    DELETE /api/links/{id}/
    """

    serializer_class = DocumentLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DocumentLink.objects.select_related("source_type", "target_type")

        source_model = self.request.query_params.get("source_model")
        source_id = self.request.query_params.get("source_id")

        if source_model and source_id:
            key = source_model.lower()
            if key in MODEL_MAP:
                app_label, model = MODEL_MAP[key]
                try:
                    ct = ContentType.objects.get(app_label=app_label, model=model)
                    # Return links where the object is either source OR target
                    from django.db.models import Q
                    qs = qs.filter(
                        Q(source_type=ct, source_id=source_id) |
                        Q(target_type=ct, target_id=source_id)
                    )
                except ContentType.DoesNotExist:
                    qs = qs.none()
            else:
                qs = qs.none()

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentLinkCreateSerializer
        return DocumentLinkSerializer

    def create(self, request, *args, **kwargs):
        serializer = DocumentLinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            link = serializer.save()
        except Exception:
            return Response(
                {"detail": "Такая связь уже существует"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            DocumentLinkSerializer(link).data,
            status=status.HTTP_201_CREATED,
        )


class NumberSequenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NumberSequence
        fields = ["id", "name", "prefix", "pattern", "reset_period"]


class NumberSequenceViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only список секвенций — для пикеров в админке EDO."""
    permission_classes = [IsAuthenticated]
    serializer_class = NumberSequenceSerializer
    queryset = NumberSequence.objects.order_by("name").all()
