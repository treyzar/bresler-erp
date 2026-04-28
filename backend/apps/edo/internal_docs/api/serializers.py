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
    """Read-only — для встраивания в DocumentType-ответ."""

    class Meta:
        model = ApprovalChainTemplate
        fields = ["id", "name", "description", "steps", "is_default", "is_active"]
        read_only_fields = fields


class ApprovalChainTemplateAdminSerializer(serializers.ModelSerializer):
    """Полный CRUD для админки."""

    class Meta:
        model = ApprovalChainTemplate
        fields = ["id", "name", "description", "steps", "is_default", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_steps(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("steps must be a list")
        for i, step in enumerate(value):
            if not isinstance(step, dict):
                raise serializers.ValidationError(f"step[{i}] must be a dict")
            if not step.get("role_key"):
                raise serializers.ValidationError(f"step[{i}]: 'role_key' is required")
            action = step.get("action") or "approve"
            if action not in {"approve", "sign", "inform", "notify_only"}:
                raise serializers.ValidationError(f"step[{i}]: invalid action {action!r}")
            pmode = (step.get("parallel_mode") or "and").lower()
            if pmode not in {"and", "or"}:
                raise serializers.ValidationError(f"step[{i}]: invalid parallel_mode {pmode!r}")
        return value


class DocumentTypeSerializer(serializers.ModelSerializer):
    """Read-only публичная версия — для каталога создания и страниц документа."""

    default_chain = ApprovalChainTemplateSerializer(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = DocumentType
        fields = [
            "code",
            "name",
            "description",
            "category",
            "category_display",
            "icon",
            "field_schema",
            "body_template",
            "title_template",
            "default_chain",
            "requires_drawn_signature",
            "visibility",
            "tenancy_override",
            "initiator_resolver",
            "addressee_mode",
            "is_active",
        ]
        read_only_fields = fields


class DocumentTypeAdminSerializer(serializers.ModelSerializer):
    """Полный CRUD для админки — поля writeable, default_chain принимает PK
    при write и полный объект при read."""

    default_chain_detail = ApprovalChainTemplateSerializer(source="default_chain", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = DocumentType
        fields = [
            "code",
            "name",
            "description",
            "category",
            "category_display",
            "icon",
            "field_schema",
            "body_template",
            "title_template",
            "default_chain",
            "default_chain_detail",
            "numbering_sequence",
            "requires_drawn_signature",
            "visibility",
            "tenancy_override",
            "initiator_resolver",
            "addressee_mode",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "default_chain_detail", "category_display"]

    def validate_field_schema(self, value):
        from django.core.exceptions import ValidationError as DjangoValidationError

        from ..services.schema import validate_field_schema as _validate

        try:
            _validate(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages) from e
        return value


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
            "id",
            "order",
            "parallel_group",
            "role_key",
            "role_label",
            "action",
            "action_display",
            "approver",
            "original_approver",
            "status",
            "status_display",
            "decided_at",
            "comment",
            "sla_due_at",
        ]
        read_only_fields = fields


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserLiteSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAttachment
        fields = [
            "id",
            "file",
            "file_url",
            "file_name",
            "file_size",
            "uploaded_by",
            "step",
            "uploaded_at",
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
            "id",
            "number",
            "title",
            "type_code",
            "type_name",
            "type_icon",
            "status",
            "status_display",
            "author",
            "addressee",
            "current_step_label",
            "current_step_approver",
            "created_at",
            "submitted_at",
            "closed_at",
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
            "id",
            "number",
            "title",
            "type",
            "author",
            "addressee",
            "field_values",
            "field_values_display",
            "body_rendered",
            "header_snapshot",
            "chain_snapshot",
            "status",
            "status_display",
            "current_step",
            "steps",
            "attachments",
            "created_at",
            "submitted_at",
            "closed_at",
        ]
        read_only_fields = [
            "id",
            "number",
            "body_rendered",
            "header_snapshot",
            "chain_snapshot",
            "status",
            "current_step",
            "steps",
            "attachments",
            "field_values_display",
            "created_at",
            "submitted_at",
            "closed_at",
        ]

    def get_field_values_display(self, obj):
        """Человекочитаемые значения полей для UI: коды → label, id → имена."""
        return _format_field_values(obj.type.field_schema or [], obj.field_values or {})


def _format_field_values(schema: list, values: dict) -> dict:
    from datetime import date

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
        elif ftype == "table" and isinstance(v, list):
            for row in v:
                if not isinstance(row, dict):
                    continue
                for col in spec.get("columns") or []:
                    if not isinstance(col, dict):
                        continue
                    cval = row.get(col.get("name"))
                    if cval in (None, "", []):
                        continue
                    if col.get("type") == "user" and isinstance(cval, (int, str)) and str(cval).isdigit():
                        user_ids.add(int(cval))
                    elif col.get("type") == "department" and isinstance(cval, (int, str)) and str(cval).isdigit():
                        dept_ids.add(int(cval))
                    elif col.get("type") == "orgunit" and isinstance(cval, (int, str)) and str(cval).isdigit():
                        orgunit_ids.add(int(cval))

    users_by_pk = {u.pk: u for u in User.objects.filter(pk__in=user_ids | user_multi_ids)}
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
            for code, display in spec.get("choices") or []:
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
                out[name] = " – ".join([d.strftime("%d.%m.%Y") for d in (f, t) if d])
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
        elif ftype == "table" and isinstance(v, list):
            out[name] = _format_table_value(spec.get("columns") or [], v, users_by_pk, depts_by_pk, orgs_by_pk)
        else:
            out[name] = str(v)

    return out


def _format_table_value(columns, rows, users_by_pk, depts_by_pk, orgs_by_pk) -> str:
    """Многострочный текст для type=table: «N. col1: val1 | col2: val2 | …».

    User/department/orgunit-колонки гидрируются по batch-словарям; date/time —
    форматируются по локали; остальное — str().
    """
    from datetime import date

    if not rows:
        return ""

    def render_cell(col, raw):
        if raw in (None, "", []):
            return ""
        ctype = col.get("type")
        if ctype == "user" and str(raw).isdigit():
            u = users_by_pk.get(int(raw))
            if u is None:
                return ""
            full = (u.get_full_name() or u.username).strip()
            return f"{full} — {u.position}" if u.position else full
        if ctype == "department" and str(raw).isdigit():
            d = depts_by_pk.get(int(raw))
            return d.name if d else ""
        if ctype == "orgunit" and str(raw).isdigit():
            o = orgs_by_pk.get(int(raw))
            return o.name if o else ""
        if ctype == "date":
            try:
                return date.fromisoformat(str(raw)[:10]).strftime("%d.%m.%Y")
            except ValueError:
                return str(raw)
        if ctype == "boolean":
            return "Да" if raw else "Нет"
        if ctype == "money":
            try:
                return f"{float(raw):.2f}"
            except (TypeError, ValueError):
                return str(raw)
        return str(raw)

    lines: list[str] = []
    for idx, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            continue
        parts: list[str] = []
        for col in columns:
            if not isinstance(col, dict):
                continue
            cname = col.get("name")
            label = col.get("label") or cname
            cell = render_cell(col, row.get(cname))
            if cell:
                parts.append(f"{label}: {cell}")
        if parts:
            lines.append(f"{idx}. " + " | ".join(parts))
    return "\n".join(lines)


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Создание черновика: автор выбирает type + заполняет field_values."""

    type = serializers.SlugRelatedField(
        slug_field="code",
        queryset=DocumentType.objects.filter(is_active=True),
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
