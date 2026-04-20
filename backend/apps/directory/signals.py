from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Contact, ContactEmployment, OrgUnit

_TRACKED_EMPLOYMENT_FIELDS = ("position", "address", "org_unit_id")


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


@receiver(pre_save, sender=Contact)
def capture_contact_employment_snapshot(sender, instance, **kwargs):
    """Record pre-save values of tracked fields so post_save can detect changes."""
    if not instance.pk:
        instance._employment_snapshot = None
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        instance._employment_snapshot = None
        return
    instance._employment_snapshot = {f: getattr(old, f) for f in _TRACKED_EMPLOYMENT_FIELDS}


@receiver(post_save, sender=Contact)
def sync_contact_employment_history(sender, instance, created, **kwargs):
    """Auto-maintain ContactEmployment when tracked Contact fields change.

    On create with org_unit set → open initial employment record.
    On update with any of position/address/org_unit changed → close the
    current record (end_date=today, is_current=False) and open a new one.
    """
    today = timezone.localdate()

    if created:
        if instance.org_unit_id:
            ContactEmployment.objects.create(
                contact=instance,
                org_unit=instance.org_unit,
                position=instance.position,
                address=instance.address,
                start_date=today,
                is_current=True,
            )
        return

    snapshot = getattr(instance, "_employment_snapshot", None)
    if snapshot is None:
        return
    new_values = {f: getattr(instance, f) for f in _TRACKED_EMPLOYMENT_FIELDS}
    if new_values == snapshot:
        return

    ContactEmployment.objects.filter(contact=instance, is_current=True).update(
        is_current=False,
        end_date=today,
    )
    if instance.org_unit_id:
        ContactEmployment.objects.create(
            contact=instance,
            org_unit=instance.org_unit,
            position=instance.position,
            address=instance.address,
            start_date=today,
            is_current=True,
        )
