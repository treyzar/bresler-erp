from django.db.models import Q
from rest_framework import generics, parsers, permissions, status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.users.models import User

from .serializers import AvatarSerializer, ChangePasswordSerializer, ProfileSerializer, UserSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint: username + password → JWT access + refresh tokens."""

    pass


class CustomTokenRefreshView(TokenRefreshView):
    """Refresh access token using refresh token."""

    pass


class CustomTokenVerifyView(TokenVerifyView):
    """Verify token validity."""

    pass


class ProfileView(generics.RetrieveUpdateAPIView):
    """Current user profile: GET and PATCH."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/users/me/change-password/ — change current user's password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"status": "ok"})


class AvatarUploadView(APIView):
    """
    POST /api/users/me/avatar/ — upload avatar (multipart/form-data).
    DELETE /api/users/me/avatar/ — remove avatar.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        serializer = AvatarSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"avatar": request.user.avatar.url if request.user.avatar else None})

    def delete(self, request):
        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
            user.save(update_fields=["avatar"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyOrdersView(APIView):
    """GET /api/users/me/orders/ — orders connected to the current user.

    Query params:
        scope: manager | creator | all (default: manager)
            - manager: user is in Order.managers
            - creator: user created the order (via simple_history + event)
            - all:     manager OR creator
        group: current | shipped | all (default: all)
        year:  filter by ship_date year
        page, page_size: pagination
    """

    permission_classes = [permissions.IsAuthenticated]

    def _scope_queryset(self, user, scope: str):
        from apps.orders.models import Order

        manager_q = Q(managers=user)
        if scope == "manager":
            return Order.objects.filter(manager_q)
        # Find orders this user created via simple_history
        HistoricalOrder = Order.history.model  # type: ignore[attr-defined]
        created_pks = HistoricalOrder.objects.filter(
            history_user=user,
            history_type="+",
        ).values_list("id", flat=True)
        creator_q = Q(pk__in=list(created_pks))
        if scope == "creator":
            return Order.objects.filter(creator_q)
        # "all" — union of both
        return Order.objects.filter(manager_q | creator_q).distinct()

    def get(self, request):
        from django.db.models import Count, Q
        from django.utils import timezone

        scope = request.query_params.get("scope", "manager")
        if scope not in ("manager", "creator", "all"):
            scope = "manager"
        group = request.query_params.get("group", "all")
        year = request.query_params.get("year")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))

        qs = self._scope_queryset(request.user, scope).select_related(
            "customer_org_unit",
            "country",
            "contract",
        )

        if group == "current":
            qs = qs.filter(status__in=["N", "D", "P", "C"])
        elif group == "shipped":
            qs = qs.filter(status__in=["S", "A"])

        if year:
            qs = qs.filter(ship_date__year=int(year))

        qs = qs.order_by("-created_at")

        # Quick stats — always based on current scope
        today = timezone.now().date()
        all_my = self._scope_queryset(request.user, scope)
        stats = all_my.aggregate(
            total=Count("id"),
            in_progress=Count("id", filter=Q(status__in=["D", "P", "C"])),
            overdue=Count(
                "id",
                filter=Q(
                    ship_date__lt=today,
                    ship_date__isnull=False,
                    status__in=["N", "D", "P", "C"],
                ),
            ),
            shipped=Count("id", filter=Q(status__in=["S", "A"])),
        )

        # Pagination
        total = qs.count()
        start = (page - 1) * page_size
        orders = qs[start : start + page_size]

        order_data = [
            {
                "id": o.pk,
                "order_number": o.order_number,
                "status": o.status,
                "status_display": o.get_status_display(),
                "customer_name": o.customer_org_unit.name if o.customer_org_unit else None,
                "ship_date": o.ship_date.isoformat() if o.ship_date else None,
                "contract_number": getattr(getattr(o, "contract", None), "contract_number", None),
                "contract_amount": str(o.contract.amount)
                if hasattr(o, "contract") and o.contract and o.contract.amount
                else None,
                "payment_status": o.contract.get_status_display() if hasattr(o, "contract") and o.contract else None,
            }
            for o in orders
        ]

        return Response(
            {
                "stats": stats,
                "orders": order_data,
                "count": total,
                "page": page,
                "page_size": page_size,
            }
        )


class ActivityFeedView(APIView):
    """GET /api/users/me/activity/ — recent activity for current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.notifications.models import Notification

        limit = int(request.query_params.get("limit", 20))
        limit = min(limit, 50)

        notifications = Notification.objects.filter(
            recipient=request.user,
        ).order_by("-created_at")[:limit]

        items = [
            {
                "id": n.pk,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ]

        return Response({"results": items})


class MyCustomersView(APIView):
    """GET /api/users/me/customers/ — list my customers.
    POST — add customer (org_unit_id).
    DELETE — remove customer (org_unit_id in body).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        customers = request.user.my_customers.all().values("id", "name", "full_name", "business_role")
        return Response(list(customers))

    def post(self, request):
        org_unit_id = request.data.get("org_unit_id")
        if not org_unit_id:
            return Response({"detail": "org_unit_id required"}, status=status.HTTP_400_BAD_REQUEST)
        request.user.my_customers.add(org_unit_id)
        return Response({"status": "ok"}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        org_unit_id = request.data.get("org_unit_id")
        if org_unit_id:
            request.user.my_customers.remove(org_unit_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyOffersView(APIView):
    """GET /api/users/me/offers/ — КП where current user is manager."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.specs.models import CommercialOffer

        qs = (
            CommercialOffer.objects.filter(
                manager=request.user,
            )
            .select_related(
                "participant__org_unit",
                "order",
            )
            .order_by("-date")[:100]
        )

        data = [
            {
                "id": o.pk,
                "offer_number": o.offer_number,
                "version": o.version,
                "status": o.status,
                "date": o.date.isoformat(),
                "participant_name": o.participant.org_unit.name if o.participant else "",
                "order_number": o.order.order_number,
                "order_id": o.order_id,
            }
            for o in qs
        ]
        return Response(data)


class MyStatsView(APIView):
    """GET /api/users/me/stats/ — personal manager statistics."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_get_manager_stats(request.user))


def _get_manager_stats(user):
    """Compute stats for a given user (manager)."""
    from django.db.models import Count, Sum

    from apps.orders.models import Order
    from apps.specs.models import CommercialOffer

    my_orders = Order.objects.filter(managers=user)

    # Basic counts
    total_orders = my_orders.count()
    shipped = my_orders.filter(status__in=["S", "A"]).count()
    in_progress = my_orders.filter(status__in=["N", "D", "P", "C"]).count()

    # Total KP and accepted KP
    total_kp = CommercialOffer.objects.filter(manager=user).count()
    accepted_kp = CommercialOffer.objects.filter(manager=user, status="accepted").count()
    conversion = round(accepted_kp / total_kp * 100, 1) if total_kp else 0

    # Company totals for share calc
    company_shipped = Order.objects.filter(status__in=["S", "A"]).count()
    my_share = round(shipped / company_shipped * 100, 1) if company_shipped else 0

    # Top 5 customers
    top_customers = list(
        my_orders.filter(customer_org_unit__isnull=False)
        .values("customer_org_unit__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:5]
    )

    # Top 5 equipment
    top_equipment = list(
        my_orders.filter(equipments__isnull=False)
        .values("equipments__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:5]
    )

    # By year
    by_year = list(
        my_orders.filter(status__in=["S", "A"])
        .extra(select={"year": "EXTRACT(year FROM ship_date)"})
        .values("year")
        .annotate(count=Count("id"), amount=Sum("contract__amount"))
        .order_by("-year")
    )

    return {
        "total_orders": total_orders,
        "shipped": shipped,
        "in_progress": in_progress,
        "total_kp": total_kp,
        "accepted_kp": accepted_kp,
        "conversion": conversion,
        "my_share": my_share,
        "top_customers": [{"name": r["customer_org_unit__name"], "count": r["count"]} for r in top_customers],
        "top_equipment": [{"name": r["equipments__name"], "count": r["count"]} for r in top_equipment],
        "by_year": [
            {"year": int(r["year"]) if r["year"] else None, "count": r["count"], "amount": float(r["amount"] or 0)}
            for r in by_year
        ],
    }


def _can_view_manager(request_user, target_user):
    """Check if request_user can view target_user's data.

    Preferred path: сравнение по User.department_unit FK (внутренняя структура).
    Fallback на legacy-строку User.department, пока не все пользователи
    перемигрированы на FK.
    """
    is_admin = request_user.groups.filter(name="admin").exists()
    if is_admin:
        return True
    if not request_user.is_department_head:
        return False
    if request_user.department_unit_id and target_user.department_unit_id:
        return request_user.department_unit_id == target_user.department_unit_id
    if request_user.department and target_user.department:
        return request_user.department == target_user.department
    return False


class UserOrdersView(APIView):
    """GET /api/users/{id}/orders/ — orders of a specific manager.
    Access: admin or department head (same department).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from apps.orders.models import Order

        target_user = User.objects.get(pk=pk)
        if not _can_view_manager(request.user, target_user):
            return Response({"detail": "Нет доступа"}, status=status.HTTP_403_FORBIDDEN)
        group = request.query_params.get("group", "all")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))

        qs = Order.objects.filter(managers=target_user).select_related(
            "customer_org_unit",
            "contract",
        )
        if group == "current":
            qs = qs.filter(status__in=["N", "D", "P", "C"])
        elif group == "shipped":
            qs = qs.filter(status__in=["S", "A"])

        qs = qs.order_by("-created_at")
        total = qs.count()
        start = (page - 1) * page_size
        orders = qs[start : start + page_size]

        return Response(
            {
                "user": {"id": target_user.pk, "full_name": target_user.get_full_name()},
                "orders": [
                    {
                        "id": o.pk,
                        "order_number": o.order_number,
                        "status": o.status,
                        "status_display": o.get_status_display(),
                        "customer_name": o.customer_org_unit.name if o.customer_org_unit else None,
                        "ship_date": o.ship_date.isoformat() if o.ship_date else None,
                        "contract_amount": str(o.contract.amount)
                        if hasattr(o, "contract") and o.contract and o.contract.amount
                        else None,
                    }
                    for o in orders
                ],
                "count": total,
                "page": page,
                "page_size": page_size,
            }
        )


class UserStatsView(APIView):
    """GET /api/users/{id}/stats/ — stats for a specific manager.
    Access: admin or department head (same department).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        target_user = User.objects.get(pk=pk)
        if not _can_view_manager(request.user, target_user):
            return Response({"detail": "Нет доступа"}, status=status.HTTP_403_FORBIDDEN)
        data = _get_manager_stats(target_user)
        data["user"] = {"id": target_user.pk, "full_name": target_user.get_full_name()}
        return Response(data)


class TeamPerformanceView(APIView):
    """GET /api/users/team-performance/ — summary table of department employees.

    Access: admin (all departments) or department heads (own department).
    Query params: department — filter by department (admin only).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Q, Sum

        from apps.orders.models import Order

        user = request.user
        is_admin = user.groups.filter(name="admin").exists()

        if not is_admin and not user.is_department_head:
            return Response(
                {"detail": "Доступ только для руководителей отделов"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find all users who are managers of at least one order
        manager_ids = Order.objects.values_list("managers", flat=True).distinct()
        managers = User.objects.filter(pk__in=manager_ids, is_active=True)

        # Фильтрация по подразделению: FK-first, fallback на legacy-строку.
        if is_admin:
            dept_unit_id = request.query_params.get("department_unit_id")
            dept_filter = request.query_params.get("department")
            if dept_unit_id:
                managers = managers.filter(department_unit_id=dept_unit_id)
            elif dept_filter:
                managers = managers.filter(department=dept_filter)
        else:
            if user.department_unit_id:
                managers = managers.filter(department_unit_id=user.department_unit_id)
            elif user.department:
                managers = managers.filter(department=user.department)
            else:
                managers = managers.none()

        managers = managers.order_by("last_name")

        # Список подразделений для admin-dropdown.
        department_units = list(
            User.objects.filter(pk__in=manager_ids, is_active=True, department_unit__isnull=False)
            .values("department_unit_id", "department_unit__name")
            .distinct()
            .order_by("department_unit__name")
        )
        departments = list(
            User.objects.filter(pk__in=manager_ids, is_active=True, department__gt="", department_unit__isnull=True)
            .values_list("department", flat=True)
            .distinct()
            .order_by("department")
        )

        rows = []
        for mgr in managers:
            my_orders = Order.objects.filter(managers=mgr)
            agg = my_orders.aggregate(
                total=Count("id"),
                current=Count("id", filter=Q(status__in=["N", "D", "P", "C"])),
                shipped=Count("id", filter=Q(status__in=["S", "A"])),
                total_amount=Sum("contract__amount", filter=Q(status__in=["S", "A"])),
            )
            rows.append(
                {
                    "id": mgr.pk,
                    "full_name": mgr.get_full_name() or mgr.username,
                    "department": mgr.department,
                    "total": agg["total"],
                    "current": agg["current"],
                    "shipped": agg["shipped"],
                    "total_amount": float(agg["total_amount"] or 0),
                }
            )

        rows.sort(key=lambda r: -r["shipped"])
        return Response(
            {
                "managers": rows,
                "departments": departments,
                "department_units": [
                    {"id": du["department_unit_id"], "name": du["department_unit__name"]} for du in department_units
                ],
                "is_admin": is_admin,
                "my_department": user.department,
                "my_department_unit_id": user.department_unit_id,
            }
        )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve users (for manager selection, etc.)."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["username", "first_name", "last_name", "patronymic"]

    def get_queryset(self):
        qs = User.objects.filter(is_active=True)
        params = self.request.query_params
        me = self.request.user

        if params.get("same_group"):
            from apps.edo.registry.services.registry_service import get_department_user_ids

            qs = qs.filter(id__in=get_department_user_ids(me))

        # Только сотрудники моего поддерева подразделений (включая меня).
        # Если у меня нет department_unit, но есть company_unit — все из моей компании.
        if params.get("in_my_subtree"):
            qs = qs.filter(id__in=_subtree_user_ids(me))

        # Только сотрудники моей компании (любой уровень дерева, включая меня).
        if params.get("in_my_company"):
            qs = qs.filter(company_unit_id=me.company_unit_id) if me.company_unit_id else qs.none()

        # Опциональный фильтр по флагу руководителя.
        if params.get("is_department_head") in ("true", "True", "1"):
            qs = qs.filter(is_department_head=True)

        return qs


def _subtree_user_ids(user) -> list[int]:
    """ID пользователей в моём department_unit и всех узлах ниже по дереву.
    Если department_unit нет — все из моей company_unit. Если и компании нет — только я."""
    if user.department_unit_id:
        from apps.directory.models import Department

        subtree = Department.get_tree(user.department_unit)
        dept_ids = list(subtree.values_list("pk", flat=True))
        return list(User.objects.filter(is_active=True, department_unit_id__in=dept_ids).values_list("pk", flat=True))
    if user.company_unit_id:
        return list(
            User.objects.filter(is_active=True, company_unit_id=user.company_unit_id).values_list("pk", flat=True)
        )
    return [user.pk]
