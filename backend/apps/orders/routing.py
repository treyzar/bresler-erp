from django.urls import re_path

from .consumers import OrderPresenceConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/orders/(?P<order_number>\d+)/presence/$",
        OrderPresenceConsumer.as_asgi(),
    ),
]
