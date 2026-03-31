from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import BaseModel


class Comment(BaseModel):
    """
    Comment attached to any Django model instance via GenericForeignKey.

    Inspired by ERPNext's comment system — every document can have comments,
    which are displayed alongside simple_history changes in a unified Timeline.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name="Автор",
    )
    text = models.TextField("Текст", max_length=5000)

    # Generic FK to link comment to any object (Order, OrgUnit, Contract, etc.)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name="Тип объекта",
    )
    object_id = models.PositiveIntegerField("ID объекта")
    content_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        verbose_name = "Комментарий"
        verbose_name_plural = "Комментарии"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id", "created_at"]),
        ]

    def __str__(self):
        return f"Comment by {self.author} on {self.content_type}#{self.object_id}"
