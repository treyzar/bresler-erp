"""
ASGI config for Bresler ERP project.
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

django_asgi_app = get_asgi_application()

from apps.comments.routing import websocket_urlpatterns as comments_ws  # noqa: E402
from apps.core.middleware import JWTAuthMiddleware  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notification_ws  # noqa: E402
from apps.orders.routing import websocket_urlpatterns as orders_ws  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(
            URLRouter(orders_ws + notification_ws + comments_ws)
        ),
    }
)
