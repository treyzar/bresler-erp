from django.urls import path

from .dashboard import DashboardView
from .views import ReportDetailView, ReportListView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/", ReportListView.as_view(), name="report-list"),
    path("reports/<str:name>/", ReportDetailView.as_view(), name="report-detail"),
]
