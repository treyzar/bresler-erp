from django.urls import re_path

from apps.comments.consumers import CommentsConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/comments/(?P<target_model>[a-z_]+)/(?P<target_id>\d+)/$",
        CommentsConsumer.as_asgi(),
    ),
]
