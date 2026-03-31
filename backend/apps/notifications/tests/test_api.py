"""Tests for notification API endpoints."""

import pytest
from rest_framework import status

from apps.notifications.services import create_notification
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestNotificationAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth_client(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_list_notifications(self, api_client):
        client = self._auth_client(api_client)
        create_notification(recipients=self.user, title="N1")
        create_notification(recipients=self.user, title="N2")

        response = client.get("/api/notifications/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_list_only_own_notifications(self, api_client):
        client = self._auth_client(api_client)
        other_user = UserFactory()

        create_notification(recipients=self.user, title="Mine")
        create_notification(recipients=other_user, title="Other")

        response = client.get("/api/notifications/")
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "Mine"

    def test_unread_count(self, api_client):
        client = self._auth_client(api_client)
        create_notification(recipients=self.user, title="N1")
        create_notification(recipients=self.user, title="N2")

        response = client.get("/api/notifications/unread-count/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_mark_read(self, api_client):
        client = self._auth_client(api_client)
        notifications = create_notification(recipients=self.user, title="Test")
        n_id = notifications[0].id

        response = client.post(f"/api/notifications/{n_id}/mark-read/")
        assert response.status_code == status.HTTP_200_OK

        # Verify unread count decreased
        response = client.get("/api/notifications/unread-count/")
        assert response.data["count"] == 0

    def test_mark_all_read(self, api_client):
        client = self._auth_client(api_client)
        create_notification(recipients=self.user, title="N1")
        create_notification(recipients=self.user, title="N2")
        create_notification(recipients=self.user, title="N3")

        response = client.post("/api/notifications/mark-all-read/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_unauthenticated_access(self, api_client):
        response = api_client.get("/api/notifications/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
