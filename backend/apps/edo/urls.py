from django.urls import include, path

app_name = "edo"

urlpatterns = [
    path("parser/", include("apps.edo.parser_app.api.urls")),
    path("templates/", include("apps.edo.templates_app.api.urls")),
    path("registry/", include("apps.edo.registry.api.urls")),
    path("internal/", include("apps.edo.internal_docs.api.urls")),
]
