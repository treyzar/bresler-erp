"""Tests for Comment API endpoints."""

import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework import status

from apps.comments.models import Comment
from apps.orders.tests.factories import OrderFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestCommentAPI:
    def setup_method(self):
        self.user = UserFactory()
        self.order = OrderFactory()

    def _auth_client(self, api_client, user=None):
        api_client.force_authenticate(user=user or self.user)
        return api_client

    def test_create_comment(self, api_client):
        client = self._auth_client(api_client)
        response = client.post("/api/comments/", {
            "text": "Test comment",
            "target_model": "order",
            "target_id": self.order.pk,
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] == "Test comment"
        assert response.data["author"] == self.user.pk
        assert response.data["author_username"] == self.user.username

    def test_create_comment_invalid_model(self, api_client):
        client = self._auth_client(api_client)
        response = client.post("/api/comments/", {
            "text": "Test",
            "target_model": "nonexistent",
            "target_id": 1,
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_comment_invalid_target_id(self, api_client):
        client = self._auth_client(api_client)
        response = client.post("/api/comments/", {
            "text": "Test",
            "target_model": "order",
            "target_id": 99999,
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_comments_for_order(self, api_client):
        client = self._auth_client(api_client)
        ct = ContentType.objects.get_for_model(self.order)

        # Create 3 comments
        for i in range(3):
            Comment.objects.create(
                author=self.user,
                text=f"Comment {i}",
                content_type=ct,
                object_id=self.order.pk,
            )

        response = client.get("/api/comments/", {
            "target_model": "order",
            "target_id": self.order.pk,
        })
        assert response.status_code == status.HTTP_200_OK
        # Response may be paginated or a list
        results = response.data.get("results", response.data)
        assert len(results) == 3

    def test_list_comments_different_orders(self, api_client):
        client = self._auth_client(api_client)
        other_order = OrderFactory()
        ct = ContentType.objects.get_for_model(self.order)

        Comment.objects.create(author=self.user, text="Comment on order 1", content_type=ct, object_id=self.order.pk)
        Comment.objects.create(author=self.user, text="Comment on order 2", content_type=ct, object_id=other_order.pk)

        response = client.get("/api/comments/", {
            "target_model": "order",
            "target_id": self.order.pk,
        })
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["text"] == "Comment on order 1"

    def test_delete_own_comment(self, api_client):
        client = self._auth_client(api_client)
        ct = ContentType.objects.get_for_model(self.order)
        comment = Comment.objects.create(
            author=self.user, text="To delete", content_type=ct, object_id=self.order.pk
        )
        response = client.delete(f"/api/comments/{comment.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Comment.objects.filter(pk=comment.pk).exists()

    def test_cannot_delete_others_comment(self, api_client):
        other_user = UserFactory()
        ct = ContentType.objects.get_for_model(self.order)
        comment = Comment.objects.create(
            author=other_user, text="Other's comment", content_type=ct, object_id=self.order.pk
        )

        client = self._auth_client(api_client)
        response = client.delete(f"/api/comments/{comment.pk}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superuser_can_delete_any_comment(self, api_client):
        admin = UserFactory(is_superuser=True)
        ct = ContentType.objects.get_for_model(self.order)
        comment = Comment.objects.create(
            author=self.user, text="User's comment", content_type=ct, object_id=self.order.pk
        )

        client = self._auth_client(api_client, user=admin)
        response = client.delete(f"/api/comments/{comment.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_access(self, api_client):
        response = api_client.get("/api/comments/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
