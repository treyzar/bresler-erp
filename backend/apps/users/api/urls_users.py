from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityFeedView,
    AvatarUploadView,
    ChangePasswordView,
    MyCustomersView,
    MyOffersView,
    MyOrdersView,
    MyStatsView,
    ProfileView,
    TeamPerformanceView,
    UserOrdersView,
    UserStatsView,
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
    path("me/customers/", MyCustomersView.as_view(), name="my-customers"),
    path("me/offers/", MyOffersView.as_view(), name="my-offers"),
    path("me/stats/", MyStatsView.as_view(), name="my-stats"),
    path("me/activity/", ActivityFeedView.as_view(), name="activity-feed"),
    path("team-performance/", TeamPerformanceView.as_view(), name="team-performance"),
    path("<int:pk>/orders/", UserOrdersView.as_view(), name="user-orders"),
    path("<int:pk>/stats/", UserStatsView.as_view(), name="user-stats"),
    path("", include(router.urls)),
]
