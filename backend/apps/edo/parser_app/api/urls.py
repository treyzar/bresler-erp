from django.urls import path

from .views import get_parsed_document, parse_document

urlpatterns = [
    path("parse/", parse_document, name="parse-document"),
    path("parse/<int:pk>/", get_parsed_document, name="get-parsed-document"),
]
