"""
WorkflowService — validates and executes status transitions.
"""

import logging

from apps.core.events import trigger_event
from apps.core.workflow.engine import TransitionDef, WorkflowConfig
from apps.core.workflow.exceptions import ConditionNotMet, TransitionNotAllowed

logger = logging.getLogger("core.workflow")


class WorkflowService:
    """Execute and validate workflow transitions."""

    @staticmethod
    def get_available_transitions(
        workflow: WorkflowConfig, instance, user=None
    ) -> list[dict]:
        """
        Get transitions available for the current status and user.
        Returns list of {to_status, label, color} dicts for the frontend.
        """
        current_status = getattr(instance, workflow.status_field)
        candidates = workflow.get_transitions_from(current_status)

        available = []
        for t in candidates:
            # Check group permission
            if not _user_can_transition(t, user):
                continue

            # Check condition — show disabled button with reason if not met
            blocked_reason = ""
            if t.condition:
                try:
                    t.condition(instance, user)
                except ConditionNotMet as e:
                    blocked_reason = e.message

            available.append({
                "to_status": t.to_status,
                "label": t.label,
                "color": t.color,
                "blocked": bool(blocked_reason),
                "blocked_reason": blocked_reason,
            })

        return available

    @staticmethod
    def transition(
        workflow: WorkflowConfig, instance, to_status: str, user=None
    ):
        """
        Execute a status transition with full validation.

        Raises:
            TransitionNotAllowed: if transition is not defined or user lacks permission
            ConditionNotMet: if transition condition fails
        """
        current_status = getattr(instance, workflow.status_field)

        # Find the transition
        transition = workflow.get_transition(current_status, to_status)
        if transition is None:
            raise TransitionNotAllowed(current_status, to_status)

        # Check user permission
        if not _user_can_transition(transition, user):
            raise TransitionNotAllowed(
                current_status,
                to_status,
                f"У вас нет прав для перехода '{current_status}' → '{to_status}'",
            )

        # Check condition
        if transition.condition:
            transition.condition(instance, user)

        # Execute transition
        old_status = current_status
        setattr(instance, workflow.status_field, to_status)
        instance.save(update_fields=[workflow.status_field, "updated_at"])

        # Determine event name from model
        model_name = instance._meta.model_name
        trigger_event(
            f"{model_name}.status_changed",
            instance=instance,
            user=user,
            old_status=old_status,
            new_status=to_status,
        )

        logger.info(
            "%s #%s: %s → %s (by %s)",
            model_name,
            instance.pk,
            old_status,
            to_status,
            user,
        )

        return instance


def _user_can_transition(transition: TransitionDef, user) -> bool:
    """Check if user belongs to one of the allowed groups."""
    if not transition.allowed_groups:
        return True
    if user is None:
        return False
    if user.is_superuser:
        return True
    user_groups = set(user.groups.values_list("name", flat=True))
    return bool(user_groups & set(transition.allowed_groups))
