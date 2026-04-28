"""Tests for Import API."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.directory.models import Equipment
from apps.users.tests.factories import UserFactory


def _make_csv(header: str, *rows: str) -> SimpleUploadedFile:
    """Create a CSV file for upload."""
    content = header + "\n" + "\n".join(rows)
    return SimpleUploadedFile("test.csv", content.encode("utf-8"), content_type="text/csv")


@pytest.mark.django_db
class TestImportAPI:
    def setup_method(self):
        self.user = UserFactory()

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_upload_csv(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("Наименование,ИНН", "ООО Тест,1234567890")

        response = client.post(
            "/api/import/upload/",
            {
                "file": csv_file,
                "target_model": "orgunit",
            },
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "mapping"
        assert "Наименование" in response.data["columns"]
        assert response.data["column_mapping"]["Наименование"] == "name"

    def test_get_fields(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("name", "Test")
        resp = client.post("/api/import/upload/", {"file": csv_file, "target_model": "equipment"}, format="multipart")
        session_id = resp.data["id"]

        resp = client.get(f"/api/import/{session_id}/fields/")
        assert resp.status_code == status.HTTP_200_OK
        field_names = [f["name"] for f in resp.data["fields"]]
        assert "name" in field_names

    def test_validate_with_errors(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("Наименование", "ООО Тест", "ООО Тест 2", "  ")

        resp = client.post("/api/import/upload/", {"file": csv_file, "target_model": "equipment"}, format="multipart")
        session_id = resp.data["id"]

        # Update mapping
        client.patch(
            f"/api/import/{session_id}/mapping/",
            {
                "column_mapping": {"Наименование": "name"},
            },
            format="json",
        )

        # Validate
        resp = client.post(f"/api/import/{session_id}/validate/")
        assert resp.status_code == status.HTTP_200_OK
        # 3 rows: 2 valid + 1 with whitespace-only name
        assert resp.data["valid_count"] >= 2
        assert resp.data["total_rows"] >= 2

    def test_apply_import(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("Наименование", "Трансформатор", "Выключатель")

        resp = client.post("/api/import/upload/", {"file": csv_file, "target_model": "equipment"}, format="multipart")
        session_id = resp.data["id"]

        client.patch(
            f"/api/import/{session_id}/mapping/",
            {
                "column_mapping": {"Наименование": "name"},
            },
            format="json",
        )

        # Validate first
        client.post(f"/api/import/{session_id}/validate/")

        # Apply
        resp = client.post(f"/api/import/{session_id}/apply/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["success_count"] == 2
        assert resp.data["error_count"] == 0
        assert Equipment.objects.count() == 2

    def test_apply_already_completed(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("Наименование", "Test")

        resp = client.post("/api/import/upload/", {"file": csv_file, "target_model": "equipment"}, format="multipart")
        session_id = resp.data["id"]
        client.patch(f"/api/import/{session_id}/mapping/", {"column_mapping": {"Наименование": "name"}}, format="json")
        client.post(f"/api/import/{session_id}/validate/")
        client.post(f"/api/import/{session_id}/apply/")

        # Try again
        resp = client.post(f"/api/import/{session_id}/apply/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_mapping_validation(self, api_client):
        client = self._auth(api_client)
        csv_file = _make_csv("col1", "val1")
        resp = client.post("/api/import/upload/", {"file": csv_file, "target_model": "equipment"}, format="multipart")
        session_id = resp.data["id"]

        # Clear mapping
        client.patch(f"/api/import/{session_id}/mapping/", {"column_mapping": {}}, format="json")

        resp = client.post(f"/api/import/{session_id}/validate/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated(self, api_client):
        response = api_client.get("/api/import/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
