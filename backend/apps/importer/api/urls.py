from rest_framework.routers import DefaultRouter

from .views import ImportSessionViewSet

router = DefaultRouter()
router.register("import", ImportSessionViewSet, basename="import-session")

urlpatterns = router.urls
