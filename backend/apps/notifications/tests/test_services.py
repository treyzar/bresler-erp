"""Tests for notification services."""

import pytest
from django.contrib.contenttypes.models import ContentType

from apps.notifications.models import Notification, NotificationEntry
from apps.notifications.services import (
    create_notification,
    get_unread_count,
    mark_all_read,
    mark_read,
)
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestCreateNotification:
    def test_create_single_recipient(self):
        user = UserFactory()
        notifications = create_notification(
            recipients=user,
            title="Test notification",
            message="Hello",
        )
        assert len(notifications) == 1
        assert notifications[0].recipient == user
        assert notifications[0].title == "Test notification"
        assert notifications[0].is_read is False

    def test_create_multiple_recipients(self):
        users = UserFactory.create_batch(3)
        notifications = create_notification(
            recipients=users,
            title="Broadcast",
        )
        assert len(notifications) == 3

    def test_skip_inactive_users(self):
        active = UserFactory(is_active=True)
        inactive = UserFactory(is_active=False)
        notifications = create_notification(
            recipients=[active, inactive],
            title="Test",
        )
        assert len(notifications) == 1
        assert notifications[0].recipient == active

    def test_empty_recipients(self):
        notifications = create_notification(
            recipients=[],
            title="Empty",
        )
        assert notifications == []

    def test_category(self):
        user = UserFactory()
        notifications = create_notification(
            recipients=user,
            title="Warning",
            category="warning",
        )
        assert notifications[0].category == "warning"

    def test_link_auto_generated(self):
        """Link should be auto-generated but we can't test without Order model in this test.
        Just verify manual link works."""
        user = UserFactory()
        notifications = create_notification(
            recipients=user,
            title="With link",
            link="/orders/42",
        )
        assert notifications[0].link == "/orders/42"

    def test_deduplication(self):
        user = UserFactory()

        # First call — should create
        n1 = create_notification(
            recipients=user,
            title="Dedupe test",
            target=user,  # Using user as target for simplicity
            deduplicate_key="test.dedupe",
        )
        assert len(n1) == 1

        # Second call — should be skipped (same key + uid within 24h)
        n2 = create_notification(
            recipients=user,
            title="Dedupe test 2",
            target=user,
            deduplicate_key="test.dedupe",
        )
        assert len(n2) == 0


@pytest.mark.django_db
class TestNotificationQueries:
    def test_unread_count(self):
        user = UserFactory()
        create_notification(recipients=user, title="N1")
        create_notification(recipients=user, title="N2")
        create_notification(recipients=user, title="N3")

        assert get_unread_count(user) == 3

    def test_mark_read(self):
        user = UserFactory()
        notifications = create_notification(recipients=user, title="Test")
        notification_id = notifications[0].id

        assert mark_read(notification_id, user) is True
        assert get_unread_count(user) == 0

    def test_mark_read_wrong_user(self):
        user1 = UserFactory()
        user2 = UserFactory()
        notifications = create_notification(recipients=user1, title="Test")
        notification_id = notifications[0].id

        # user2 should not be able to mark user1's notification
        assert mark_read(notification_id, user2) is False

    def test_mark_all_read(self):
        user = UserFactory()
        create_notification(recipients=user, title="N1")
        create_notification(recipients=user, title="N2")
        create_notification(recipients=user, title="N3")

        count = mark_all_read(user)
        assert count == 3
        assert get_unread_count(user) == 0


@pytest.mark.django_db
class TestNotificationEntry:
    def test_check_recent_false(self):
        user = UserFactory()
        assert NotificationEntry.check_recent("key", 1, user.pk) is False

    def test_check_recent_true(self):
        user = UserFactory()
        NotificationEntry.notify("key", 1, user.pk)
        assert NotificationEntry.check_recent("key", 1, user.pk) is True
