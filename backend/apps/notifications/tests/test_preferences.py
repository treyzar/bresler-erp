"""Tests for NotificationPreference model, service integration, and API."""

import pytest
from rest_framework import status

from apps.notifications.models import NotificationPreference
from apps.notifications.services import create_notification
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestNotificationPreferenceModel:
    def test_default_values(self):
        user = UserFactory()
        pref = NotificationPreference.objects.create(user=user)
        assert pref.order_created == "bell"
        assert pref.order_status_changed == "all"
        assert pref.order_deadline == "all"
        assert pref.contract_payment == "bell"
        assert pref.comments == "bell"
        assert pref.import_completed == "bell"

    def test_is_bell_enabled(self):
        user = UserFactory()
        pref = NotificationPreference.objects.create(user=user)
        assert pref.is_bell_enabled("order_created") is True
        assert pref.is_bell_enabled("order_status_changed") is True  # "all" includes bell

        pref.order_created = "none"
        pref.save()
        assert pref.is_bell_enabled("order_created") is False

        pref.order_created = "email"
        pref.save()
        assert pref.is_bell_enabled("order_created") is False

    def test_is_email_enabled(self):
        user = UserFactory()
        pref = NotificationPreference.objects.create(user=user)
        assert pref.is_email_enabled("order_created") is False  # default "bell"
        assert pref.is_email_enabled("order_status_changed") is True  # default "all"

        pref.order_created = "email"
        pref.save()
        assert pref.is_email_enabled("order_created") is True

    def test_get_channel_unknown_field(self):
        user = UserFactory()
        pref = NotificationPreference.objects.create(user=user)
        assert pref.get_channel("nonexistent_field") == "bell"


@pytest.mark.django_db
class TestPreferenceServiceIntegration:
    def test_notification_skipped_when_bell_disabled(self):
        user = UserFactory()
        NotificationPreference.objects.create(user=user, order_created="none")

        notifications = create_notification(
            recipients=user,
            title="New order",
            deduplicate_key="order.created",
        )
        assert notifications == []

    def test_notification_skipped_when_email_only(self):
        user = UserFactory()
        NotificationPreference.objects.create(user=user, order_created="email")

        notifications = create_notification(
            recipients=user,
            title="New order",
            deduplicate_key="order.created",
        )
        assert notifications == []

    def test_notification_created_when_bell_enabled(self):
        user = UserFactory()
        NotificationPreference.objects.create(user=user, order_created="bell")

        notifications = create_notification(
            recipients=user,
            title="New order",
            deduplicate_key="order.created",
        )
        assert len(notifications) == 1

    def test_notification_created_when_all_channels(self):
        user = UserFactory()
        NotificationPreference.objects.create(user=user, order_status_changed="all")

        notifications = create_notification(
            recipients=user,
            title="Status changed",
            deduplicate_key="order.status_changed",
        )
        assert len(notifications) == 1

    def test_preference_auto_created_on_first_notification(self):
        """Preference should be auto-created if it doesn't exist yet."""
        user = UserFactory()
        assert not NotificationPreference.objects.filter(user=user).exists()

        notifications = create_notification(
            recipients=user,
            title="Test",
            deduplicate_key="order.created",
        )
        # Default for order_created is "bell" → notification should be created
        assert len(notifications) == 1
        assert NotificationPreference.objects.filter(user=user).exists()

    def test_no_preference_check_without_deduplicate_key(self):
        """Notifications without deduplicate_key skip preference check entirely."""
        user = UserFactory()
        # Even with all preferences disabled, no deduplicate_key means no check
        NotificationPreference.objects.create(
            user=user,
            order_created="none",
            order_status_changed="none",
        )

        notifications = create_notification(
            recipients=user,
            title="Generic notification",
            # No deduplicate_key → no preference lookup
        )
        assert len(notifications) == 1

    def test_mixed_preferences_multiple_recipients(self):
        user_enabled = UserFactory()
        user_disabled = UserFactory()
        NotificationPreference.objects.create(user=user_enabled, comments="bell")
        NotificationPreference.objects.create(user=user_disabled, comments="none")

        notifications = create_notification(
            recipients=[user_enabled, user_disabled],
            title="New comment",
            deduplicate_key="comment.order",
        )
        assert len(notifications) == 1
        assert notifications[0].recipient == user_enabled


@pytest.mark.django_db
class TestNotificationPreferenceAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_get_preferences_creates_default(self, api_client):
        client = self._auth(api_client)
        response = client.get("/api/notifications/preferences/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["order_created"] == "bell"
        assert response.data["order_status_changed"] == "all"
        assert NotificationPreference.objects.filter(user=self.user).exists()

    def test_patch_preferences(self, api_client):
        client = self._auth(api_client)
        # Ensure created
        client.get("/api/notifications/preferences/")

        response = client.patch(
            "/api/notifications/preferences/",
            {"order_created": "none", "comments": "all"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["order_created"] == "none"
        assert response.data["comments"] == "all"
        # Unchanged fields remain default
        assert response.data["order_status_changed"] == "all"

    def test_patch_invalid_value(self, api_client):
        client = self._auth(api_client)
        client.get("/api/notifications/preferences/")

        response = client.patch(
            "/api/notifications/preferences/",
            {"order_created": "invalid_value"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated(self, api_client):
        response = api_client.get("/api/notifications/preferences/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
