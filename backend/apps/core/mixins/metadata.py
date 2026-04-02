"""
MetadataMixin — auto-generates filter metadata from FilterSet and model fields.

Adds a `/meta/` action to any ViewSet that returns field definitions,
available filters, search fields, and ordering fields. The frontend
can use this to dynamically build filter UIs.

Inspired by ERPNext (DocType meta) and Odoo (search view).

Usage:
    class OrderViewSet(MetadataMixin, ModelViewSet):
        filterset_class = OrderFilter
        search_fields = ["order_number", "note"]
        ordering_fields = ["order_number", "created_at"]

        # Optional: override labels, UI hints, related endpoints
        meta_extra = {
            "customer": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?business_role=customer"},
            "country": {"widget": "combobox", "endpoint": "/api/directory/countries/"},
            "equipment": {"widget": "combobox", "endpoint": "/api/directory/equipment/"},
            "ship_date_from": {"range_group": "ship_date"},
            "ship_date_to": {"range_group": "ship_date"},
        }

    GET /api/orders/meta/ →
    {
        "model": "Order",
        "filters": [...],
        "search_fields": [...],
        "ordering_fields": [...]
    }
"""

from django.db import models
from django_filters import rest_framework as django_filters
from rest_framework.decorators import action
from rest_framework.response import Response

# Map django-filter classes to simple type strings
_FILTER_TYPE_MAP = {
    django_filters.CharFilter: "text",
    django_filters.NumberFilter: "number",
    django_filters.BooleanFilter: "boolean",
    django_filters.DateFilter: "date",
    django_filters.DateTimeFilter: "datetime",
    django_filters.ChoiceFilter: "choice",
    django_filters.ModelChoiceFilter: "foreign_key",
    django_filters.ModelMultipleChoiceFilter: "many_to_many",
}

# Map lookup expressions to widget hints
_LOOKUP_WIDGET_MAP = {
    "exact": None,  # default for type
    "icontains": "text",
    "gte": "date",
    "lte": "date",
}


def _get_filter_type(filter_instance) -> str:
    """Determine the filter type string from a django-filter instance."""
    for filter_cls, type_name in _FILTER_TYPE_MAP.items():
        if isinstance(filter_instance, filter_cls):
            return type_name
    return "text"


def _get_model_field(model, field_name: str):
    """Safely get a model field, returning None if not found."""
    try:
        return model._meta.get_field(field_name)
    except Exception:
        return None


def _get_choices(model_field) -> list[dict] | None:
    """Extract choices from a model field if it has them."""
    if model_field and hasattr(model_field, "choices") and model_field.choices:
        return [{"value": k, "label": str(v)} for k, v in model_field.choices]
    return None


def _get_field_label(model_field, filter_name: str) -> str:
    """Get the verbose_name for a model field, or humanize the filter name."""
    if model_field and hasattr(model_field, "verbose_name") and model_field.verbose_name:
        return str(model_field.verbose_name).capitalize()
    # Humanize: ship_date_from → Ship date from
    return filter_name.replace("_", " ").capitalize()


class MetadataMixin:
    """
    Adds GET /meta/ endpoint that returns filter and field metadata.

    Introspects `filterset_class`, `search_fields`, and `ordering_fields`
    to build a JSON description of available filters.

    Configure `meta_extra` dict on the ViewSet to add widget hints,
    related endpoints, and range groupings.
    """

    meta_extra: dict = {}

    @action(detail=False, methods=["get"])
    def meta(self, request):
        model = self._get_meta_model()
        filters = self._build_filter_meta(model)
        search_fields = self._build_search_fields(model)
        ordering_fields = self._build_ordering_fields(model)

        return Response({
            "model": model.__name__ if model else None,
            "model_verbose": str(model._meta.verbose_name) if model else None,
            "model_verbose_plural": str(model._meta.verbose_name_plural) if model else None,
            "filters": filters,
            "search_fields": search_fields,
            "ordering_fields": ordering_fields,
        })

    def _get_meta_model(self):
        """Get the model class from filterset or queryset."""
        filterset_class = getattr(self, "filterset_class", None)
        if filterset_class and hasattr(filterset_class, "Meta"):
            return filterset_class.Meta.model

        queryset = getattr(self, "queryset", None)
        if queryset is not None:
            return queryset.model

        return None

    def _build_filter_meta(self, model) -> list[dict]:
        """Build filter metadata from the FilterSet class."""
        filterset_class = getattr(self, "filterset_class", None)
        if not filterset_class:
            # Fallback: filterset_fields
            return self._build_from_filterset_fields(model)

        # Instantiate filterset to get declared + generated filters
        fs = filterset_class()
        result = []

        for name, filter_inst in fs.filters.items():
            # Skip 'search' — it's handled by search_fields
            if name == "search":
                continue

            filter_type = _get_filter_type(filter_inst)

            # Resolve actual model field name
            field_name = filter_inst.field_name or name
            model_field = _get_model_field(model, field_name) if model else None

            # Detect choice fields → promote to "choice" type
            choices = _get_choices(model_field)
            if choices and filter_type == "text":
                filter_type = "choice"

            # Get label
            label = filter_inst.label or _get_field_label(model_field, name)

            entry = {
                "name": name,
                "type": filter_type,
                "label": str(label),
                "lookup": filter_inst.lookup_expr or "exact",
                "field_name": field_name,
                "required": filter_inst.extra.get("required", False),
            }

            # Add choices
            if choices:
                entry["choices"] = choices

            # Add boolean options explicitly
            if filter_type == "boolean":
                entry["choices"] = [
                    {"value": "true", "label": "Да"},
                    {"value": "false", "label": "Нет"},
                ]

            # Has custom method?
            if filter_inst.method:
                entry["custom_method"] = True

            # Merge extra config from meta_extra
            extra = self.meta_extra.get(name, {})
            if extra:
                entry.update(extra)

            result.append(entry)

        return result

    def _build_from_filterset_fields(self, model) -> list[dict]:
        """Build minimal filter metadata from filterset_fields attribute."""
        filterset_fields = getattr(self, "filterset_fields", None)
        if not filterset_fields or not model:
            return []

        result = []
        if isinstance(filterset_fields, dict):
            items = filterset_fields.items()
        else:
            items = [(f, ["exact"]) for f in filterset_fields]

        for field_name, lookups in items:
            model_field = _get_model_field(model, field_name)
            choices = _get_choices(model_field)
            label = _get_field_label(model_field, field_name)

            for lookup in (lookups if isinstance(lookups, list) else [lookups]):
                entry = {
                    "name": field_name if lookup == "exact" else f"{field_name}__{lookup}",
                    "type": "choice" if choices else "text",
                    "label": str(label),
                    "lookup": lookup,
                    "field_name": field_name,
                    "required": False,
                }
                if choices:
                    entry["choices"] = choices
                result.append(entry)

        return result

    def _build_search_fields(self, model) -> list[dict]:
        """Build search field metadata."""
        search_fields = getattr(self, "search_fields", None)
        if not search_fields or not model:
            return []

        result = []
        for field_path in search_fields:
            # Strip DRF search prefixes (^, =, @, $)
            clean = field_path.lstrip("^=@$")
            parts = clean.split("__")
            # Resolve to the first field for label
            model_field = _get_model_field(model, parts[0])
            label = _get_field_label(model_field, clean)

            result.append({
                "field": clean,
                "label": str(label),
            })

        return result

    def _build_ordering_fields(self, model) -> list[dict]:
        """Build ordering field metadata."""
        ordering_fields = getattr(self, "ordering_fields", None)
        if not ordering_fields or not model:
            return []

        if ordering_fields == "__all__":
            return [{"field": "__all__", "label": "Все поля"}]

        result = []
        for field_name in ordering_fields:
            model_field = _get_model_field(model, field_name)
            label = _get_field_label(model_field, field_name)
            result.append({
                "field": field_name,
                "label": str(label),
            })

        return result
