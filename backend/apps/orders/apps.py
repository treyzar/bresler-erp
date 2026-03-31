from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = "Orders"

    def ready(self):
        from apps.core.signals import register_auto_events

        from .models import Contract

        # Only Contract gets auto-events.
        # Order events are triggered explicitly in ViewSet.perform_create/perform_update
        # because auto post_save fires BEFORE M2M fields (managers, contacts) are saved.
        register_auto_events(Contract)
