from rest_framework.routers import DefaultRouter

from .views import DocumentLinkViewSet

router = DefaultRouter()
router.register("links", DocumentLinkViewSet, basename="document-link")

urlpatterns = router.urls
