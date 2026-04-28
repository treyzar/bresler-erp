import django.core.validators
import django.db.models.deletion
import simple_history.models
from django.conf import settings
from django.db import migrations, models

import apps.edo.registry.models.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Letter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "number",
                    models.CharField(editable=False, max_length=20, unique=True, verbose_name="Номер документа"),
                ),
                ("date", models.DateField(verbose_name="Дата документа")),
                (
                    "direction",
                    models.CharField(
                        choices=[("outgoing", "Исходящее"), ("incoming", "Входящее")],
                        default="outgoing",
                        max_length=10,
                        verbose_name="Направление",
                    ),
                ),
                ("recipient", models.CharField(blank=True, max_length=255, verbose_name="Получатель")),
                ("sender", models.CharField(blank=True, max_length=255, verbose_name="Отправитель")),
                ("subject", models.CharField(max_length=255, verbose_name="Тема")),
                ("note", models.TextField(blank=True, verbose_name="Заметки")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создано")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Изменено")),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="created_letters",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Создал",
                    ),
                ),
                (
                    "executor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="executed_letters",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Исполнитель",
                    ),
                ),
            ],
            options={
                "verbose_name": "Письмо",
                "verbose_name_plural": "Письма",
                "ordering": ["-date", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalLetter",
            fields=[
                ("id", models.BigIntegerField(blank=True, db_index=True)),
                ("number", models.CharField(max_length=20, verbose_name="Номер документа")),
                ("date", models.DateField(verbose_name="Дата документа")),
                (
                    "direction",
                    models.CharField(
                        choices=[("outgoing", "Исходящее"), ("incoming", "Входящее")],
                        default="outgoing",
                        max_length=10,
                        verbose_name="Направление",
                    ),
                ),
                ("recipient", models.CharField(blank=True, max_length=255, verbose_name="Получатель")),
                ("sender", models.CharField(blank=True, max_length=255, verbose_name="Отправитель")),
                ("subject", models.CharField(max_length=255, verbose_name="Тема")),
                ("note", models.TextField(blank=True, verbose_name="Заметки")),
                ("created_at", models.DateTimeField(blank=True, editable=False, verbose_name="Создано")),
                ("updated_at", models.DateTimeField(blank=True, editable=False, verbose_name="Изменено")),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Создал",
                    ),
                ),
                (
                    "executor",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Исполнитель",
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "historical Письмо",
                "verbose_name_plural": "historical Письма",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="LetterFile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "file",
                    models.FileField(
                        upload_to=apps.edo.registry.models.models._letter_file_upload_path,
                        validators=[apps.edo.registry.models.models._validate_file],
                        verbose_name="Файл",
                    ),
                ),
                ("file_name", models.CharField(max_length=255, verbose_name="Имя файла")),
                ("file_type", models.CharField(max_length=50, verbose_name="Тип файла")),
                ("file_size", models.PositiveIntegerField(verbose_name="Размер (байт)")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True, verbose_name="Загружено")),
                (
                    "letter",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="registry.letter",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="uploaded_letter_files",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Загрузил",
                    ),
                ),
            ],
            options={
                "verbose_name": "Файл письма",
                "verbose_name_plural": "Файлы письма",
                "ordering": ["uploaded_at"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalLetterFile",
            fields=[
                ("id", models.BigIntegerField(blank=True, db_index=True)),
                ("file", models.TextField(max_length=100, verbose_name="Файл")),
                ("file_name", models.CharField(max_length=255, verbose_name="Имя файла")),
                ("file_type", models.CharField(max_length=50, verbose_name="Тип файла")),
                ("file_size", models.PositiveIntegerField(verbose_name="Размер (байт)")),
                ("uploaded_at", models.DateTimeField(blank=True, editable=False, verbose_name="Загружено")),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "letter",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="registry.letter",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Загрузил",
                    ),
                ),
            ],
            options={
                "verbose_name": "historical Файл письма",
                "verbose_name_plural": "historical Файлы письма",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
    ]
