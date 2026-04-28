from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommercialOfferViewSet, ParticipantContactViewSet

router = DefaultRouter()
router.register("offers", CommercialOfferViewSet, basename="offers")

urlpatterns = [
    path("", include(router.urls)),
    # Nested under order: /api/orders/{order_pk}/offers/
    path(
        "orders/<int:order_pk>/offers/",
        CommercialOfferViewSet.as_view({"get": "list", "post": "create"}),
        name="order-offers-list",
    ),
    path(
        "orders/<int:order_pk>/offers/<int:pk>/",
        CommercialOfferViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="order-offers-detail",
    ),
    # Participant contacts
    path(
        "participants/<int:participant_pk>/contacts/",
        ParticipantContactViewSet.as_view({"get": "list", "post": "create"}),
        name="participant-contacts-list",
    ),
    path(
        "participants/<int:participant_pk>/contacts/<int:pk>/",
        ParticipantContactViewSet.as_view({"get": "retrieve", "delete": "destroy"}),
        name="participant-contacts-detail",
    ),
]
