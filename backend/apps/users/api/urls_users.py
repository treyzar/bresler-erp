from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProfileView, UserViewSet

app_name = "users"

router = DefaultRouter()
router.register("", UserViewSet, basename="user")

urlpatterns = [
    path("me/", ProfileView.as_view(), name="profile"),
    path("", include(router.urls)),
]
