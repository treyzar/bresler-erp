from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentTemplateViewSet, OrderViewSet

app_name = "orders"

router = DefaultRouter()
router.register("document-templates", DocumentTemplateViewSet, basename="document-template")
router.register("", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
]
