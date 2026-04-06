import django_filters

from apps.specs.models import CommercialOffer


class CommercialOfferFilter(django_filters.FilterSet):
    participant = django_filters.NumberFilter(field_name="participant_id")
    status = django_filters.ChoiceFilter(choices=CommercialOffer.Status.choices)
    manager = django_filters.NumberFilter(field_name="manager_id")
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = CommercialOffer
        fields = ["participant", "status", "manager", "date_from", "date_to"]
