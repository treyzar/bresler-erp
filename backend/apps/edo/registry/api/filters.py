import django_filters

from apps.edo.registry.models import Letter


class LetterFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    executor = django_filters.NumberFilter(field_name="executor_id")
    direction = django_filters.CharFilter(field_name="direction", lookup_expr="exact")
    number = django_filters.CharFilter(field_name="number", lookup_expr="icontains")
    subject = django_filters.CharFilter(field_name="subject", lookup_expr="icontains")
    recipient = django_filters.CharFilter(field_name="recipient", lookup_expr="icontains")
    sender = django_filters.CharFilter(field_name="sender", lookup_expr="icontains")

    class Meta:
        model = Letter
        fields = ["date_from", "date_to", "executor", "direction", "number", "subject", "recipient", "sender"]
