"""Tests for the Event System."""

from unittest.mock import patch

import pytest

from apps.core.events import (
    clear_registry,
    get_registered_events,
    on_event,
    suppress_events,
    trigger_event,
)


@pytest.fixture(autouse=True)
def clean_registry():
    """Clear event registry before and after each test."""
    clear_registry()
    yield
    clear_registry()


class TestEventRegistration:
    def test_register_handler(self):
        @on_event("test.event")
        def handler(**kwargs):
            pass

        events = get_registered_events()
        assert "test.event" in events
        assert len(events["test.event"]) == 1

    def test_register_multiple_events(self):
        @on_event("event.a", "event.b")
        def handler(**kwargs):
            pass

        events = get_registered_events()
        assert "event.a" in events
        assert "event.b" in events

    def test_register_multiple_handlers(self):
        @on_event("test.event")
        def handler_a(**kwargs):
            pass

        @on_event("test.event")
        def handler_b(**kwargs):
            pass

        events = get_registered_events()
        assert len(events["test.event"]) == 2


class TestTriggerEvent:
    def test_trigger_calls_handler(self):
        called = []

        @on_event("test.trigger")
        def handler(event_name, **kwargs):
            called.append(event_name)

        trigger_event("test.trigger")
        assert called == ["test.trigger"]

    def test_trigger_passes_kwargs(self):
        received = {}

        @on_event("test.kwargs")
        def handler(event_name, **kwargs):
            received.update(kwargs)

        trigger_event("test.kwargs", foo="bar", number=42)
        assert received["foo"] == "bar"
        assert received["number"] == 42

    def test_trigger_nonexistent_event(self):
        # Should not raise
        trigger_event("nonexistent.event")

    def test_handler_exception_does_not_break_others(self):
        called = []

        @on_event("test.exception")
        def bad_handler(event_name, **kwargs):
            raise ValueError("boom")

        @on_event("test.exception")
        def good_handler(event_name, **kwargs):
            called.append("ok")

        trigger_event("test.exception")
        assert called == ["ok"]


class TestSuppressEvents:
    def test_suppress_context_manager(self):
        called = []

        @on_event("test.suppress")
        def handler(event_name, **kwargs):
            called.append(True)

        with suppress_events():
            trigger_event("test.suppress")

        assert called == []

    def test_events_resume_after_suppress(self):
        called = []

        @on_event("test.resume")
        def handler(event_name, **kwargs):
            called.append(True)

        with suppress_events():
            trigger_event("test.resume")

        trigger_event("test.resume")
        assert called == [True]

    def test_suppress_decorator(self):
        called = []

        @on_event("test.decorator")
        def handler(event_name, **kwargs):
            called.append(True)

        @suppress_events()
        def do_bulk_work():
            trigger_event("test.decorator")
            trigger_event("test.decorator")

        do_bulk_work()
        assert called == []


class TestAsyncDispatch:
    def test_async_handler_registered_with_flag(self):
        @on_event("test.async", async_task=True)
        def handler(**kwargs):
            pass

        events = get_registered_events()
        assert "test.async" in events

    @patch("apps.core.tasks.run_event_handler.delay")
    def test_async_handler_dispatched_via_celery(self, mock_delay):
        """Async handlers should be dispatched via Celery task, not called directly."""

        @on_event("test.async_dispatch", async_task=True)
        def handler(event_name, **kwargs):
            pass

        trigger_event("test.async_dispatch", foo="bar")

        mock_delay.assert_called_once()
        call_args = mock_delay.call_args
        handler_path = call_args[0][0]
        assert "handler" in handler_path
        assert call_args[0][1]["foo"] == "bar"

    @patch("apps.core.tasks.run_event_handler.delay")
    def test_sync_handler_called_directly(self, mock_delay):
        """Sync handlers should NOT go through Celery."""
        called = []

        @on_event("test.sync_direct")
        def handler(event_name, **kwargs):
            called.append(True)

        trigger_event("test.sync_direct")

        assert called == [True]
        mock_delay.assert_not_called()

    @patch("apps.core.tasks.run_event_handler.delay")
    def test_mixed_sync_and_async_handlers(self, mock_delay):
        """Both sync and async handlers on the same event."""
        sync_called = []

        @on_event("test.mixed")
        def sync_handler(event_name, **kwargs):
            sync_called.append(True)

        @on_event("test.mixed", async_task=True)
        def async_handler(event_name, **kwargs):
            pass

        trigger_event("test.mixed")

        assert sync_called == [True]
        mock_delay.assert_called_once()


class TestClearRegistry:
    def test_clear(self):
        @on_event("test.clear")
        def handler(**kwargs):
            pass

        clear_registry()
        assert get_registered_events() == {}
