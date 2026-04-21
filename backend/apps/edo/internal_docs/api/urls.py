from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentTypeViewSet, DocumentViewSet

router = DefaultRouter()
router.register(r"types", DocumentTypeViewSet, basename="document-type")
router.register(r"documents", DocumentViewSet, basename="document")

urlpatterns = [
    path("", include(router.urls)),
]
