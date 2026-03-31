"""
Linked Documents — universal cross-document relationships.

Inspired by ERPNext's "links" in DocType. Allows any document to be
linked to any other document without hard-coding FK relationships.
"""

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import BaseModel


class DocumentLink(BaseModel):
    """Universal link between any two model instances."""

    source_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="source_links"
    )
    source_id = models.PositiveIntegerField()
    source = GenericForeignKey("source_type", "source_id")

    target_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="target_links"
    )
    target_id = models.PositiveIntegerField()
    target = GenericForeignKey("target_type", "target_id")

    link_type = models.CharField("Тип связи", max_length=50, blank=True, default="related")
    note = models.CharField("Примечание", max_length=255, blank=True)

    class Meta:
        verbose_name = "Связь документов"
        verbose_name_plural = "Связи документов"
        indexes = [
            models.Index(fields=["source_type", "source_id"]),
            models.Index(fields=["target_type", "target_id"]),
        ]
        unique_together = [("source_type", "source_id", "target_type", "target_id")]

    def __str__(self):
        return f"{self.source_type}#{self.source_id} → {self.target_type}#{self.target_id}"
