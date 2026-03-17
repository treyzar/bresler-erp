from django.db import migrations, models


def populate_seq(apps, schema_editor):
    """
    Assign unique sequential integers to existing letters.
    Sort by the numeric part of the number (then by pk to break ties),
    so the natural order is preserved as closely as possible.
    """
    Letter = apps.get_model('registry', 'Letter')

    def sort_key(letter):
        try:
            return (int(letter.number.split('-')[-1]), letter.pk)
        except (ValueError, IndexError):
            return (0, letter.pk)

    letters = sorted(Letter.objects.all(), key=sort_key)
    for seq, letter in enumerate(letters, start=1):
        letter.seq = seq
        letter.save(update_fields=['seq'])


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0001_initial'),
    ]

    operations = [
        # Step 1: add nullable (no unique constraint yet)
        migrations.AddField(
            model_name='letter',
            name='seq',
            field=models.PositiveIntegerField(
                verbose_name='Сквозной номер',
                null=True,
                editable=False,
            ),
        ),
        # Step 2: populate unique values from existing data
        migrations.RunPython(populate_seq, migrations.RunPython.noop),
        # Step 3: now safe to add unique constraint
        migrations.AlterField(
            model_name='letter',
            name='seq',
            field=models.PositiveIntegerField(
                verbose_name='Сквозной номер',
                null=True,
                unique=True,
                editable=False,
            ),
        ),
        migrations.AlterModelOptions(
            name='letter',
            options={
                'verbose_name': 'Письмо',
                'verbose_name_plural': 'Письма',
                'ordering': ['-seq'],
            },
        ),
    ]
