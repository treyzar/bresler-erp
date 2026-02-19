from django.db import models


def bulk_delete(model_class: type[models.Model], ids: list[int]) -> int:
    """Bulk delete records by IDs. Returns count of deleted records."""
    deleted, _ = model_class.objects.filter(id__in=ids).delete()
    return deleted
