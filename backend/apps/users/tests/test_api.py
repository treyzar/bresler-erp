import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .factories import UserFactory


@pytest.mark.django_db
class TestTokenEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory(username="authuser")
        self.user.set_password("testpass123")
        self.user.save()

    def test_obtain_token(self):
        url = reverse("auth:token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "authuser", "password": "testpass123"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_token_invalid_credentials(self):
        url = reverse("auth:token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "authuser", "password": "wrongpass"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self):
        # Get tokens first
        url = reverse("auth:token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "authuser", "password": "testpass123"},
        )
        refresh_token = response.data["refresh"]

        # Refresh
        url = reverse("auth:token_refresh")
        response = self.client.post(url, {"refresh": refresh_token})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_verify_token(self):
        # Get tokens first
        url = reverse("auth:token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "authuser", "password": "testpass123"},
        )
        access_token = response.data["access"]

        # Verify
        url = reverse("auth:token_verify")
        response = self.client.post(url, {"token": access_token})
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestProfileEndpoint:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory(
            username="profileuser",
            first_name="Иван",
            last_name="Иванов",
            patronymic="Иванович",
            department="IT",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        url = reverse("users:profile")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "profileuser"
        assert response.data["full_name"] == "Иванов Иван Иванович"
        assert response.data["department"] == "IT"

    def test_update_profile(self):
        url = reverse("users:profile")
        response = self.client.patch(url, {"phone": "+375291234567"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["phone"] == "+375291234567"

    def test_profile_unauthenticated(self):
        client = APIClient()
        url = reverse("users:profile")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestChangePassword:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory(username="pwduser")
        self.user.set_password("OldPass123!")
        self.user.save()
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password_confirm": "NewPass456!",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.check_password("NewPass456!")

    def test_change_password_wrong_current(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "WrongPass!",
                "new_password": "NewPass456!",
                "new_password_confirm": "NewPass456!",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_mismatch(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password_confirm": "Different789!",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_unauthenticated(self):
        client = APIClient()
        response = client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password_confirm": "NewPass456!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAvatarUpload:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_upload_avatar(self):
        import io

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        # Create a real 1x1 PNG in memory
        buf = io.BytesIO()
        Image.new("RGB", (1, 1), color="red").save(buf, format="PNG")
        buf.seek(0)
        image = SimpleUploadedFile("avatar.png", buf.read(), content_type="image/png")
        response = self.client.post("/api/users/me/avatar/", {"avatar": image}, format="multipart")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["avatar"] is not None

    def test_delete_avatar(self):
        response = self.client.delete("/api/users/me/avatar/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_avatar_unauthenticated(self):
        client = APIClient()
        response = client.post("/api/users/me/avatar/", {}, format="multipart")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMyOrders:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_my_orders_returns_200(self):
        response = self.client.get("/api/users/me/orders/")
        assert response.status_code == status.HTTP_200_OK
        assert "stats" in response.data
        assert "orders" in response.data
        assert response.data["stats"]["total"] == 0

    def test_my_orders_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/users/me/orders/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestActivityFeed:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_activity_returns_200(self):
        response = self.client.get("/api/users/me/activity/")
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_activity_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/users/me/activity/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserListEndpoint:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_list_users(self):
        UserFactory.create_batch(3)
        url = reverse("users:user-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 3

    def test_search_users(self):
        UserFactory(first_name="Специальный", last_name="Пользователь")
        url = reverse("users:user-list")
        response = self.client.get(url, {"search": "Специальный"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1
