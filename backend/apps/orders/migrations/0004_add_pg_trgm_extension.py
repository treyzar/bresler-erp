from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_remove_order_pqs_alter_historicalorder_designer_and_more"),
    ]

    operations = [
        TrigramExtension(),
    ]
