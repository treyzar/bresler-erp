from django.db import migrations

GROUPS_WITH_DEVICES = ["admin", "otm", "projects", "procurement"]


def add_devices_module(apps, schema_editor):
    GroupProfile = apps.get_model("users", "GroupProfile")
    for profile in GroupProfile.objects.filter(group__name__in=GROUPS_WITH_DEVICES):
        if "devices" not in profile.allowed_modules:
            profile.allowed_modules.append("devices")
            profile.save(update_fields=["allowed_modules"])


def remove_devices_module(apps, schema_editor):
    GroupProfile = apps.get_model("users", "GroupProfile")
    for profile in GroupProfile.objects.filter(group__name__in=GROUPS_WITH_DEVICES):
        if "devices" in profile.allowed_modules:
            profile.allowed_modules.remove("devices")
            profile.save(update_fields=["allowed_modules"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_seed_groups"),
    ]

    operations = [
        migrations.RunPython(add_devices_module, remove_devices_module),
    ]
