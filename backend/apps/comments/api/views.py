from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.comments.api.serializers import CommentCreateSerializer, CommentSerializer
from apps.comments.models import Comment
from apps.core.events import trigger_event


class CommentViewSet(ModelViewSet):
    """
    Comments on any object.

    list: GET /api/comments/?target_model=order&target_id=123
    create: POST /api/comments/ {text, target_model, target_id}
    update: PATCH /api/comments/{id}/ {text}
    delete: DELETE /api/comments/{id}/
    """

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    # Model name → (app_label, model)
    MODEL_MAP = {
        "order": ("orders", "order"),
        "contract": ("orders", "contract"),
        "orgunit": ("directory", "orgunit"),
        "contact": ("directory", "contact"),
        "letter": ("registry", "letter"),
    }

    def get_queryset(self):
        qs = Comment.objects.select_related("author")

        # For detail actions (retrieve, update, destroy) — return all comments
        # so users can see/delete others' comments if authorized
        if self.action in ("retrieve", "update", "partial_update", "destroy"):
            return qs

        # Filter by target model + id for list action
        target_model = self.request.query_params.get("target_model")
        target_id = self.request.query_params.get("target_id")

        if target_model and target_id:
            key = target_model.lower()
            if key in self.MODEL_MAP:
                app_label, model = self.MODEL_MAP[key]
                try:
                    ct = ContentType.objects.get(app_label=app_label, model=model)
                    qs = qs.filter(content_type=ct, object_id=target_id)
                except ContentType.DoesNotExist:
                    qs = qs.none()
            else:
                qs = qs.none()
        else:
            # Without filter, return only user's own comments
            qs = qs.filter(author=self.request.user)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return CommentCreateSerializer
        return CommentSerializer

    def create(self, request, *args, **kwargs):
        serializer = CommentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        trigger_event(
            "comment.created",
            instance=comment,
            user=request.user,
            target=comment.content_object,
        )

        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user:
            return Response(
                {"detail": "Можно редактировать только свои комментарии."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user and not request.user.is_superuser:
            return Response(
                {"detail": "Можно удалять только свои комментарии."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)
