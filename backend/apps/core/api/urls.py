from rest_framework.routers import DefaultRouter

from .views import DocumentLinkViewSet, NumberSequenceViewSet

router = DefaultRouter()
router.register("links", DocumentLinkViewSet, basename="document-link")
router.register("sequences", NumberSequenceViewSet, basename="number-sequence")

urlpatterns = router.urls
