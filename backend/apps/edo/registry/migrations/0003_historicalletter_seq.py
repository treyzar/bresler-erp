from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0002_letter_seq"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicalletter",
            name="seq",
            field=models.PositiveIntegerField(
                blank=True,
                editable=False,
                null=True,
                verbose_name="Сквозной номер",
            ),
        ),
    ]
