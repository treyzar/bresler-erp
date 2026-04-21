from django.urls import path, include

app_name = "edo"

urlpatterns = [
    path('doc-builder/', include('apps.edo.doc_builder.api.urls')),
    path('parser/', include('apps.edo.parser_app.api.urls')),
    path('templates/', include('apps.edo.templates_app.api.urls')),
    path('registry/', include('apps.edo.registry.api.urls')),
    path('internal/', include('apps.edo.internal_docs.api.urls')),
]
