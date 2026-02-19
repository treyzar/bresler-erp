from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import OrgUnit, PQ


def _track_name_changes(model_class, instance):
    """Track previous names when the name field changes."""
    if not instance.pk:
        return
    try:
        old_instance = model_class.objects.get(pk=instance.pk)
    except model_class.DoesNotExist:
        return
    if old_instance.name != instance.name:
        if instance.previous_names is None:
            instance.previous_names = []
        instance.previous_names.append(old_instance.name)


@receiver(pre_save, sender=OrgUnit)
def track_orgunit_name_changes(sender, instance, **kwargs):
    """Track previous names of OrgUnit on name change."""
    _track_name_changes(sender, instance)


@receiver(pre_save, sender=PQ)
def track_pq_name_changes(sender, instance, **kwargs):
    """Track previous names of PQ on name change."""
    _track_name_changes(sender, instance)
