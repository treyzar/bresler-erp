"""Tests for the Event System."""

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


class TestClearRegistry:
    def test_clear(self):
        @on_event("test.clear")
        def handler(**kwargs):
            pass

        clear_registry()
        assert get_registered_events() == {}
