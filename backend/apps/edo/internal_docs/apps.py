from django.apps import AppConfig


class InternalDocsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.edo.internal_docs"
    label = "internal_docs"
    verbose_name = "ЭДО: внутренний документооборот"
