"""
Introduces ContactEmployment — a log of a contact's past / parallel
employers. Data flows to it when the user explicitly tracks history;
Contact.org_units (M2M) continues to hold the current employer until
a future migration consolidates the two.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0005_historicalcity_historicalcontact_historicalcountry_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContactEmployment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("position", models.CharField(blank=True, max_length=255, verbose_name="Должность")),
                ("start_date", models.DateField(blank=True, null=True, verbose_name="Начало")),
                ("end_date", models.DateField(blank=True, null=True, verbose_name="Окончание")),
                ("is_current", models.BooleanField(default=False, verbose_name="Текущая")),
                ("note", models.CharField(blank=True, max_length=500, verbose_name="Комментарий")),
                ("contact", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="employments",
                    to="directory.contact",
                    verbose_name="Контакт",
                )),
                ("org_unit", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="employments",
                    to="directory.orgunit",
                    verbose_name="Организация",
                )),
            ],
            options={
                "verbose_name": "Место работы контакта",
                "verbose_name_plural": "Места работы контактов",
                "ordering": ["-is_current", "-start_date"],
                "indexes": [
                    models.Index(fields=["contact", "is_current"], name="directory_c_contact_02f2d5_idx"),
                ],
            },
        ),
    ]
