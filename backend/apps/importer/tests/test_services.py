"""Tests for import services — event suppression during bulk import."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.core.events import clear_registry, on_event
from apps.directory.models import Equipment
from apps.importer.models import ImportSession
from apps.importer.services import apply_import
from apps.users.tests.factories import UserFactory


def _make_csv_file(header: str, *rows: str) -> SimpleUploadedFile:
    content = header + "\n" + "\n".join(rows)
    return SimpleUploadedFile("test.csv", content.encode("utf-8"), content_type="text/csv")


@pytest.fixture(autouse=True)
def clean_events():
    clear_registry()
    yield
    clear_registry()


@pytest.mark.django_db
class TestImportSuppressEvents:
    def test_auto_events_suppressed_during_import(self):
        """Auto-events (e.g. equipment.created) should NOT fire for each row during import."""
        created_events = []

        @on_event("equipment.created")
        def track_created(event_name, **kwargs):
            created_events.append(event_name)

        user = UserFactory()
        csv_file = _make_csv_file("Наименование", "Item1", "Item2", "Item3")
        session = ImportSession.objects.create(
            user=user,
            file=csv_file,
            original_filename="test.csv",
            target_model="equipment",
            status=ImportSession.Status.PROCESSING,
            column_mapping={"Наименование": "name"},
        )

        apply_import(session)

        assert Equipment.objects.count() == 3
        # Auto-events should be suppressed during bulk creation
        assert created_events == []

    def test_import_completed_event_fires_after_import(self):
        """The import.completed event should still fire after the bulk loop."""
        completed_events = []

        @on_event("import.completed")
        def track_completed(event_name, **kwargs):
            completed_events.append(kwargs.get("instance"))

        user = UserFactory()
        csv_file = _make_csv_file("Наименование", "Item1")
        session = ImportSession.objects.create(
            user=user,
            file=csv_file,
            original_filename="test.csv",
            target_model="equipment",
            status=ImportSession.Status.PROCESSING,
            column_mapping={"Наименование": "name"},
        )

        apply_import(session)

        assert len(completed_events) == 1
        assert completed_events[0] == session
