from rest_framework.routers import DefaultRouter

from .views import LetterViewSet

router = DefaultRouter()
router.register("letters", LetterViewSet, basename="letter")

urlpatterns = router.urls
