from django.apps import AppConfig


class DirectoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.directory"
    verbose_name = "Directory"

    def ready(self):
        import apps.directory.signals  # noqa: F401
        from apps.core.signals import register_auto_events

        from .models import Contact, OrgUnit

        register_auto_events(OrgUnit, Contact)
