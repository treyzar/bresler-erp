from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityFeedView,
    AvatarUploadView,
    ChangePasswordView,
    MyOrdersView,
    ProfileView,
    UserViewSet,
)

app_name = "users"

router = DefaultRouter()
router.register("", UserViewSet, basename="user")

urlpatterns = [
    path("me/", ProfileView.as_view(), name="profile"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("me/avatar/", AvatarUploadView.as_view(), name="avatar"),
    path("me/orders/", MyOrdersView.as_view(), name="my-orders"),
    path("me/activity/", ActivityFeedView.as_view(), name="activity-feed"),
    path("", include(router.urls)),
]
