from django.urls import path
from .views import parse_document, get_parsed_document

urlpatterns = [
    path('parse/', parse_document, name='parse-document'),
    path('parse/<int:pk>/', get_parsed_document, name='get-parsed-document'),
]
