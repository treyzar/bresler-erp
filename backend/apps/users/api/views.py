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


class MyOrdersView(generics.ListAPIView):
    """GET /api/users/me/orders/ — orders where current user is a manager."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.orders.models import Order

        status_filter = request.query_params.get("status")
        qs = Order.objects.filter(
            managers=request.user,
        ).select_related(
            "customer_org_unit", "country", "contract",
        ).order_by("-created_at")

        if status_filter:
            qs = qs.filter(status=status_filter)

        # Quick stats
        from django.db.models import Count, Q
        from django.utils import timezone

        today = timezone.now().date()
        stats = Order.objects.filter(managers=request.user).aggregate(
            total=Count("id"),
            in_progress=Count("id", filter=Q(status__in=["D", "P", "C"])),
            overdue=Count("id", filter=Q(
                ship_date__lt=today,
                ship_date__isnull=False,
                status__in=["N", "D", "P", "C"],
            )),
        )

        # Return paginated orders + stats
        orders = qs[:50]
        order_data = [
            {
                "id": o.pk,
                "order_number": o.order_number,
                "status": o.status,
                "status_display": o.get_status_display(),
                "customer_name": o.customer_org_unit.name if o.customer_org_unit else None,
                "ship_date": o.ship_date.isoformat() if o.ship_date else None,
                "contract_number": o.contract.contract_number if hasattr(o, "contract") and o.contract else None,
            }
            for o in orders
        ]

        return Response({
            "stats": stats,
            "orders": order_data,
        })


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


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve users (for manager selection, etc.)."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["username", "first_name", "last_name", "patronymic"]

    def get_queryset(self):
        qs = User.objects.filter(is_active=True)
        if self.request.query_params.get("same_group"):
            from apps.edo.registry.services.registry_service import get_department_user_ids
            ids = get_department_user_ids(self.request.user)
            qs = qs.filter(id__in=ids)
        return qs
