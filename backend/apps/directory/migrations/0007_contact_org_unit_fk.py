"""
Consolidate Contact ↔ OrgUnit: replace the M2M 'org_units' with a single
FK 'org_unit' (current employer). Mirrors every existing M2M row into
ContactEmployment so nothing is lost.
"""

import django.db.models.deletion
from django.db import migrations, models


def migrate_m2m_to_fk(apps, schema_editor):
    Contact = apps.get_model("directory", "Contact")
    ContactEmployment = apps.get_model("directory", "ContactEmployment")

    for contact in Contact.objects.prefetch_related("org_units").all():
        org_units = list(contact.org_units.all())
        if not org_units:
            continue

        primary = org_units[0]
        contact.org_unit_id = primary.id
        contact.save(update_fields=["org_unit"])

        # Only create history rows that don't already exist (idempotent rerun)
        existing_pairs = set(
            ContactEmployment.objects.filter(contact=contact)
            .values_list("org_unit_id", flat=True)
        )
        for i, ou in enumerate(org_units):
            if ou.id in existing_pairs:
                continue
            ContactEmployment.objects.create(
                contact=contact,
                org_unit=ou,
                position=contact.position or "",
                is_current=(i == 0),
            )


def reverse_fk_to_m2m(apps, schema_editor):
    Contact = apps.get_model("directory", "Contact")
    ContactEmployment = apps.get_model("directory", "ContactEmployment")
    for emp in ContactEmployment.objects.select_related("contact", "org_unit"):
        emp.contact.org_units.add(emp.org_unit)
    for c in Contact.objects.filter(org_unit__isnull=False):
        c.org_units.add(c.org_unit)


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0006_contact_employment"),
    ]

    operations = [
        # Add FK to Contact
        migrations.AddField(
            model_name="contact",
            name="org_unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="contacts_primary",
                to="directory.orgunit",
                verbose_name="Организация (текущая)",
            ),
        ),
        # Mirror field onto HistoricalContact (simple_history tracks scalars/FKs)
        migrations.AddField(
            model_name="historicalcontact",
            name="org_unit",
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="+",
                to="directory.orgunit",
                verbose_name="Организация (текущая)",
            ),
        ),
        # Copy data: first org_units → org_unit; mirror all into ContactEmployment
        migrations.RunPython(migrate_m2m_to_fk, reverse_fk_to_m2m),
        # Drop the old M2M
        migrations.RemoveField(
            model_name="contact",
            name="org_units",
        ),
        # Fix related_name now that M2M's "contacts" is gone
        migrations.AlterField(
            model_name="contact",
            name="org_unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="contacts",
                to="directory.orgunit",
                verbose_name="Организация (текущая)",
            ),
        ),
    ]
