from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.registry import discover, get_all_reports, get_report


class ReportListView(APIView):
    """GET /api/reports/ — list all available reports."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        discover()
        reports = get_all_reports()
        return Response([r.get_meta() for r in reports])


class ReportDetailView(APIView):
    """GET /api/reports/{name}/ — execute a report with filters."""
    permission_classes = [IsAuthenticated]

    def get(self, request, name):
        discover()
        report = get_report(name)
        if report is None:
            return Response({"detail": "Отчёт не найден"}, status=404)

        # Extract filters from query params
        filters = {}
        for f in report.filters:
            value = request.query_params.get(f.name)
            if value:
                filters[f.name] = value

        data = report.get_data(filters)
        meta = report.get_meta()

        return Response({
            "meta": meta,
            "data": data,
            "count": len(data),
        })
