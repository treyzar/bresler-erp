from rest_framework import generics, permissions, viewsets
from rest_framework.filters import SearchFilter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.users.models import User

from .serializers import ProfileSerializer, UserSerializer


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
