from django.db import migrations


def forwards(apps, schema_editor):
    from apps.edo.templates_app.services.signature_recovery import recover_signatures

    Template = apps.get_model("templates_app", "Template")
    TemplateVersion = apps.get_model("templates_app", "TemplateVersion")

    for tpl in Template.objects.all():
        recovered = recover_signatures(tpl.editor_content or [], tpl.html_content or "")
        if recovered != (tpl.editor_content or []):
            tpl.editor_content = recovered
            tpl.save(update_fields=["editor_content"])

    for ver in TemplateVersion.objects.all():
        recovered = recover_signatures(ver.editor_content or [], ver.html_content or "")
        if recovered != (ver.editor_content or []):
            ver.editor_content = recovered
            ver.save(update_fields=["editor_content"])


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("templates_app", "0003_normalize_editor_content"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
