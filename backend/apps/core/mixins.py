from django.db import models
from django.utils.text import slugify


class AuditMixin(models.Model):
    """Mixin to track who created/modified a record."""

    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True


class SlugMixin(models.Model):
    """Mixin to auto-generate slug from name field."""

    slug = models.SlugField(max_length=255, unique=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.slug and hasattr(self, "name"):
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)
