from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0007_contact_org_unit_fk"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="contactemployment",
            new_name="directory_c_contact_ee7cf3_idx",
            old_name="directory_c_contact_02f2d5_idx",
        ),
    ]
