"""Seed default NumberSequence records."""

from django.db import migrations


def seed_sequences(apps, schema_editor):
    NumberSequence = apps.get_model("core", "NumberSequence")
    sequences = [
        {
            "name": "contract",
            "prefix": "ДОГ",
            "pattern": "{prefix}-{YYYY}-{####}",
            "current_value": 0,
            "reset_period": "yearly",
            "last_reset_year": 0,
        },
    ]
    for seq_data in sequences:
        NumberSequence.objects.get_or_create(name=seq_data["name"], defaults=seq_data)


def reverse(apps, schema_editor):
    NumberSequence = apps.get_model("core", "NumberSequence")
    NumberSequence.objects.filter(name__in=["contract"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_sequences, reverse),
    ]
