from django.db import migrations


def _normalize(editor_content):
    # Локальный импорт, чтобы миграция была самодостаточной даже при переименовании сервиса.
    from apps.edo.templates_app.services.normalization import normalize_editor_content
    return normalize_editor_content(editor_content)


def forwards(apps, schema_editor):
    Template = apps.get_model("templates_app", "Template")
    TemplateVersion = apps.get_model("templates_app", "TemplateVersion")

    for tpl in Template.objects.all():
        normalized = _normalize(tpl.editor_content)
        if normalized != tpl.editor_content:
            tpl.editor_content = normalized
            tpl.save(update_fields=["editor_content"])

    for ver in TemplateVersion.objects.all():
        normalized = _normalize(ver.editor_content)
        if normalized != ver.editor_content:
            ver.editor_content = normalized
            ver.save(update_fields=["editor_content"])


def backwards(apps, schema_editor):
    # Откат бессмысленен: старый "плоский" формат терял данные.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("templates_app", "0002_template_is_deleted"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
