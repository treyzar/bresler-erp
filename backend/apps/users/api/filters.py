from django_filters import rest_framework as filters

from apps.users.models import User


class UserFilter(filters.FilterSet):
    department = filters.CharFilter(lookup_expr="icontains")
    company = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = User
        fields = ["department", "company", "is_active"]
