"""Tests for Workflow Engine."""

import pytest

from apps.core.workflow import (
    ConditionNotMet,
    TransitionDef,
    TransitionNotAllowed,
    WorkflowConfig,
    WorkflowService,
)
from apps.orders.models import Order
from apps.orders.tests.factories import ContractFactory, OrderFactory
from apps.users.tests.factories import UserFactory


def make_workflow():
    """Create a test workflow matching ORDER_WORKFLOW structure."""

    def require_ship_date(instance, user):
        if not instance.ship_date:
            raise ConditionNotMet("Заполните дату отгрузки")

    return WorkflowConfig(
        status_field="status",
        transitions=[
            TransitionDef("N", "D", label="В Договор", allowed_groups=["otm", "admin"]),
            TransitionDef("D", "P", label="В Производство"),
            TransitionDef("P", "C", label="Собран"),
            TransitionDef("C", "S", label="Отгрузить", condition=require_ship_date),
            TransitionDef("S", "A", label="В архив"),
            TransitionDef("N", "A", label="Архивировать", allowed_groups=["admin"]),
        ],
    )


@pytest.mark.django_db
class TestWorkflowService:
    def test_get_available_transitions(self):
        wf = make_workflow()
        order = OrderFactory(status="N")
        user = UserFactory(is_superuser=True)

        transitions = WorkflowService.get_available_transitions(wf, order, user)
        to_statuses = [t["to_status"] for t in transitions]
        assert "D" in to_statuses
        assert "A" in to_statuses

    def test_transition_success(self):
        wf = make_workflow()
        order = OrderFactory(status="D")
        user = UserFactory()

        WorkflowService.transition(wf, order, "P", user=user)
        order.refresh_from_db()
        assert order.status == "P"

    def test_transition_not_allowed(self):
        wf = make_workflow()
        order = OrderFactory(status="N")
        user = UserFactory()

        with pytest.raises(TransitionNotAllowed):
            WorkflowService.transition(wf, order, "P", user=user)  # N → P not defined

    def test_transition_group_check(self):
        wf = make_workflow()
        order = OrderFactory(status="N")
        # User not in otm or admin group
        user = UserFactory()

        transitions = WorkflowService.get_available_transitions(wf, order, user)
        # N → D requires otm/admin, N → A requires admin — neither available
        assert len(transitions) == 0

    def test_transition_superuser_bypasses_groups(self):
        wf = make_workflow()
        order = OrderFactory(status="N")
        admin = UserFactory(is_superuser=True)

        transitions = WorkflowService.get_available_transitions(wf, order, admin)
        assert len(transitions) == 2  # D and A

    def test_condition_not_met(self):
        wf = make_workflow()
        order = OrderFactory(status="C", ship_date=None)
        user = UserFactory()

        with pytest.raises(ConditionNotMet, match="дату отгрузки"):
            WorkflowService.transition(wf, order, "S", user=user)

    def test_condition_met(self):
        from datetime import date
        wf = make_workflow()
        order = OrderFactory(status="C", ship_date=date(2026, 4, 1))
        user = UserFactory()

        WorkflowService.transition(wf, order, "S", user=user)
        order.refresh_from_db()
        assert order.status == "S"

    def test_condition_blocks_button(self):
        wf = make_workflow()
        order = OrderFactory(status="C", ship_date=None)
        user = UserFactory()

        transitions = WorkflowService.get_available_transitions(wf, order, user)
        s_transition = next((t for t in transitions if t["to_status"] == "S"), None)
        assert s_transition is not None  # Button shown but blocked
        assert s_transition["blocked"] is True
        assert "дату отгрузки" in s_transition["blocked_reason"]


@pytest.mark.django_db
class TestOrderTransitionAPI:
    def setup_method(self):
        self.user = UserFactory(is_superuser=True)

    def _auth(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    def test_get_transitions(self, api_client):
        order = OrderFactory(status="N")
        ContractFactory(order=order)  # N→D requires contract to exist
        client = self._auth(api_client)
        resp = client.get(f"/api/orders/{order.order_number}/transitions/")
        assert resp.status_code == 200
        to_statuses = [t["to_status"] for t in resp.data]
        assert "D" in to_statuses

    def test_execute_transition(self, api_client):
        order = OrderFactory(status="P")  # P→C has no conditions
        client = self._auth(api_client)
        resp = client.post(
            f"/api/orders/{order.order_number}/transition/",
            {"status": "C"},
        )
        assert resp.status_code == 200
        order.refresh_from_db()
        assert order.status == "C"

    def test_invalid_transition(self, api_client):
        order = OrderFactory(status="N")
        client = self._auth(api_client)
        resp = client.post(
            f"/api/orders/{order.order_number}/transition/",
            {"status": "S"},  # N → S not allowed
        )
        assert resp.status_code == 403

    def test_condition_failure(self, api_client):
        order = OrderFactory(status="N")
        client = self._auth(api_client)
        # N → D requires contract
        resp = client.post(
            f"/api/orders/{order.order_number}/transition/",
            {"status": "D"},
        )
        assert resp.status_code == 400
        assert "контракт" in resp.data["detail"].lower()
