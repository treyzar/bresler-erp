import pytest
from rest_framework.test import APIClient

from apps.users.services.auth_service import authenticate_user

from .factories import UserFactory


@pytest.mark.django_db
class TestAuthService:
    def test_authenticate_valid_credentials(self):
        user = UserFactory(username="testauth")
        user.set_password("testpass123")
        user.save()

        result = authenticate_user("testauth", "testpass123")
        assert result is not None
        assert result.pk == user.pk

    def test_authenticate_invalid_password(self):
        user = UserFactory(username="testauth2")
        user.set_password("testpass123")
        user.save()

        result = authenticate_user("testauth2", "wrongpass")
        assert result is None

    def test_authenticate_nonexistent_user(self):
        result = authenticate_user("nonexistent", "password")
        assert result is None


@pytest.mark.django_db
class TestJWTProtectedEndpoints:
    def test_access_with_valid_token(self):
        user = UserFactory()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/users/me/")
        assert response.status_code == 200

    def test_access_without_token(self):
        client = APIClient()
        response = client.get("/api/users/me/")
        assert response.status_code == 401
