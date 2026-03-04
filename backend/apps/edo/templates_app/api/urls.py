from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TemplateViewSet, share_info, share_render

router = DefaultRouter()
router.register(r'templates', TemplateViewSet, basename='template')

urlpatterns = [
    path('', include(router.urls)),
    path('share/<str:token>/', share_info, name='share-info'),
    path('share/<str:token>/render/', share_render, name='share-render'),
]
