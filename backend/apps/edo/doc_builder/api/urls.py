from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ExportJsonView,
    ImportJsonView,
    ExportDocxView,
    ExportPdfView,
    ImportDocxView,
    ImportPdfView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list-create'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:pk>/export/json/', ExportJsonView.as_view(), name='export-json'),
    path('projects/<int:pk>/export/docx/', ExportDocxView.as_view(), name='export-docx'),
    path('projects/<int:pk>/export/pdf/', ExportPdfView.as_view(), name='export-pdf'),
    path('import/json/', ImportJsonView.as_view(), name='import-json'),
    path('import/docx/', ImportDocxView.as_view(), name='import-docx'),
    path('import/pdf/', ImportPdfView.as_view(), name='import-pdf'),
]
