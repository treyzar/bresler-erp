from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GroupProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.CharField(blank=True, max_length=255, verbose_name='Описание')),
                ('allowed_modules', models.JSONField(
                    default=list,
                    help_text='Список slug-ов модулей: orders, directory, edo, reports',
                    verbose_name='Доступные модули',
                )),
                ('group', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='profile',
                    to='auth.group',
                )),
            ],
            options={
                'verbose_name': 'Профиль группы',
                'verbose_name_plural': 'Профили групп',
            },
        ),
    ]
