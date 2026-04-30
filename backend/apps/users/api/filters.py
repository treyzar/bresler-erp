from django_filters import rest_framework as filters

from apps.users.models import User


class UserFilter(filters.FilterSet):
    """Фильтрация пользователей через Assignment.

    `department` / `company` принимают подстроку имени и матчат пользователей,
    у которых есть active assignment с подходящим именем компании/подразделения.
    """

    department = filters.CharFilter(method="filter_by_department_name")
    company = filters.CharFilter(method="filter_by_company_name")

    class Meta:
        model = User
        fields = ["department", "company", "is_active"]

    def filter_by_department_name(self, qs, _name, value):
        if not value:
            return qs
        return qs.filter(
            assignments__department__name__icontains=value,
            assignments__is_active=True,
        ).distinct()

    def filter_by_company_name(self, qs, _name, value):
        if not value:
            return qs
        return qs.filter(
            assignments__company__name__icontains=value,
            assignments__is_active=True,
        ).distinct()
