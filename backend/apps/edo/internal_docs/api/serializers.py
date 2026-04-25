"""DRF serializers для API внутреннего документооборота."""

from rest_framework import serializers

from ..models import (
    ApprovalChainTemplate,
    ApprovalStep,
    Document,
    DocumentAttachment,
    DocumentType,
)


class ApprovalChainTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalChainTemplate
        fields = ["id", "name", "description", "steps", "is_default", "is_active"]
        read_only_fields = fields


class DocumentTypeSerializer(serializers.ModelSerializer):
    default_chain = ApprovalChainTemplateSerializer(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = DocumentType
        fields = [
            "code", "name", "description", "category", "category_display",
            "icon", "field_schema", "body_template", "title_template",
            "default_chain",
            "requires_drawn_signature", "visibility", "tenancy_override",
            "initiator_resolver", "addressee_mode", "is_active",
        ]
        read_only_fields = fields


class UserLiteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField(source="get_full_name")
    full_name_short = serializers.CharField()
    position = serializers.CharField()


class ApprovalStepSerializer(serializers.ModelSerializer):
    approver = UserLiteSerializer(read_only=True)
    original_approver = UserLiteSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = ApprovalStep
        fields = [
            "id", "order", "parallel_group", "role_key", "role_label",
            "action", "action_display",
            "approver", "original_approver",
            "status", "status_display",
            "decided_at", "comment", "sla_due_at",
        ]
        read_only_fields = fields


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserLiteSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAttachment
        fields = [
            "id", "file", "file_url", "file_name", "file_size",
            "uploaded_by", "step", "uploaded_at",
        ]
        read_only_fields = ["id", "file_url", "file_name", "file_size", "uploaded_by", "uploaded_at"]
        extra_kwargs = {
            "file": {"write_only": True},
            "step": {"required": False, "allow_null": True},
        }

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None


class DocumentListSerializer(serializers.ModelSerializer):
    """Короткая версия для списков: «Мои документы», «Ждут меня» и т.д."""
    type_name = serializers.CharField(source="type.name", read_only=True)
    type_code = serializers.CharField(source="type.code", read_only=True)
    type_icon = serializers.CharField(source="type.icon", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    author = UserLiteSerializer(read_only=True)
    addressee = UserLiteSerializer(read_only=True)
    current_step_label = serializers.SerializerMethodField()
    current_step_approver = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "number", "title",
            "type_code", "type_name", "type_icon",
            "status", "status_display",
            "author", "addressee",
            "current_step_label", "current_step_approver",
            "created_at", "submitted_at", "closed_at",
        ]
        read_only_fields = fields

    def get_current_step_label(self, obj):
        return obj.current_step.role_label if obj.current_step else None

    def get_current_step_approver(self, obj):
        step = obj.current_step
        if not step or not step.approver_id:
            return None
        # Для коллективных шагов (role_key=group:NAME) pre-resolved approver
        # — это просто первый сотрудник из группы по алфавиту. Показывать его
        # в списке вводит в заблуждение, поэтому скрываем до момента решения.
        if (step.role_key or "").startswith("group:") and step.status == "pending":
            return None
        return UserLiteSerializer(step.approver).data


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Полная версия для страницы документа."""
    type = DocumentTypeSerializer(read_only=True)
    author = UserLiteSerializer(read_only=True)
    addressee = UserLiteSerializer(read_only=True)
    steps = ApprovalStepSerializer(many=True, read_only=True)
    attachments = DocumentAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    field_values_display = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "number", "title",
            "type", "author", "addressee",
            "field_values", "field_values_display", "body_rendered",
            "header_snapshot", "chain_snapshot",
            "status", "status_display", "current_step",
            "steps", "attachments",
            "created_at", "submitted_at", "closed_at",
        ]
        read_only_fields = [
            "id", "number", "body_rendered", "header_snapshot",
            "chain_snapshot", "status", "current_step",
            "steps", "attachments", "field_values_display",
            "created_at", "submitted_at", "closed_at",
        ]

    def get_field_values_display(self, obj):
        """Человекочитаемые значения полей для UI: коды → label, id → имена."""
        return _format_field_values(obj.type.field_schema or [], obj.field_values or {})


def _format_field_values(schema: list, values: dict) -> dict:
    from datetime import date, datetime
    from django.contrib.auth import get_user_model
    from apps.directory.models import Department, OrgUnit
    User = get_user_model()
    out: dict[str, str] = {}

    # Соберём id-шники для batch-запросов.
    user_ids: set[int] = set()
    user_multi_ids: set[int] = set()
    dept_ids: set[int] = set()
    orgunit_ids: set[int] = set()
    for spec in schema:
        if not isinstance(spec, dict):
            continue
        name = spec.get("name")
        ftype = spec.get("type")
        v = values.get(name)
        if v in (None, "", []):
            continue
        if ftype == "user" and isinstance(v, int):
            user_ids.add(v)
        elif ftype == "user_multi" and isinstance(v, list):
            user_multi_ids.update(int(x) for x in v if isinstance(x, (int, str)) and str(x).isdigit())
        elif ftype == "department" and isinstance(v, int):
            dept_ids.add(v)
        elif ftype == "orgunit" and isinstance(v, int):
            orgunit_ids.add(v)

    users_by_pk = {
        u.pk: u for u in User.objects.filter(pk__in=user_ids | user_multi_ids)
    }
    depts_by_pk = {d.pk: d for d in Department.objects.filter(pk__in=dept_ids)}
    orgs_by_pk = {o.pk: o for o in OrgUnit.objects.filter(pk__in=orgunit_ids)}

    def _user_label(u) -> str:
        full = (u.get_full_name() or u.username).strip()
        return f"{full} — {u.position}" if u.position else full

    for spec in schema:
        if not isinstance(spec, dict):
            continue
        name = spec.get("name")
        ftype = spec.get("type")
        v = values.get(name)

        if v is None or v == "":
            out[name] = ""
            continue

        if ftype == "choice":
            label = v
            for code, display in (spec.get("choices") or []):
                if code == v:
                    label = display
                    break
            out[name] = str(label)
        elif ftype == "boolean":
            out[name] = "Да" if v else "Нет"
        elif ftype == "date":
            try:
                d = date.fromisoformat(str(v)[:10])
                out[name] = d.strftime("%d.%m.%Y")
            except ValueError:
                out[name] = str(v)
        elif ftype == "date_range" and isinstance(v, dict):
            try:
                f = date.fromisoformat(str(v.get("from", ""))[:10]) if v.get("from") else None
                t = date.fromisoformat(str(v.get("to", ""))[:10]) if v.get("to") else None
                out[name] = " – ".join([
                    d.strftime("%d.%m.%Y") for d in (f, t) if d
                ])
            except ValueError:
                out[name] = ""
        elif ftype == "user":
            try:
                u = users_by_pk.get(int(v))
                out[name] = _user_label(u) if u else ""
            except (TypeError, ValueError):
                out[name] = ""
        elif ftype == "user_multi" and isinstance(v, list):
            names = []
            for x in v:
                try:
                    u = users_by_pk.get(int(x))
                    if u:
                        names.append((u.get_full_name() or u.username).strip())
                except (TypeError, ValueError):
                    continue
            out[name] = ", ".join(names) if names else ""
        elif ftype == "department":
            try:
                d = depts_by_pk.get(int(v))
                out[name] = d.name if d else ""
            except (TypeError, ValueError):
                out[name] = ""
        elif ftype == "orgunit":
            try:
                o = orgs_by_pk.get(int(v))
                out[name] = o.name if o else ""
            except (TypeError, ValueError):
                out[name] = ""
        else:
            out[name] = str(v)

    return out


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Создание черновика: автор выбирает type + заполняет field_values."""
    type = serializers.SlugRelatedField(
        slug_field="code", queryset=DocumentType.objects.filter(is_active=True),
    )

    class Meta:
        model = Document
        fields = ["type", "title", "field_values", "addressee"]

    def validate_field_values(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("field_values должен быть dict")
        return value


class ApprovalActionSerializer(serializers.Serializer):
    """Payload для approve / reject / request_revision."""
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    signature_image = serializers.CharField(required=False, allow_blank=True, default="")


class DelegateSerializer(serializers.Serializer):
    to_user = serializers.IntegerField()
