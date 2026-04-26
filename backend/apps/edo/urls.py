from django.urls import path, include

app_name = "edo"

urlpatterns = [
    # NB: apps/edo/doc_builder — deprecated дублёр templates_app (см. plan_edo_internal_doc_flow.md §11 Фаза 4).
    # API закрыт; код и таблицы — остаются до подтверждения, что в legacy-БД нет ценных данных.
    # Полное удаление (DeleteModel migration + удаление папки) — в следующем релизе по итогам аудита dev/prod.
    path('parser/', include('apps.edo.parser_app.api.urls')),
    path('templates/', include('apps.edo.templates_app.api.urls')),
    path('registry/', include('apps.edo.registry.api.urls')),
    path('internal/', include('apps.edo.internal_docs.api.urls')),
]
