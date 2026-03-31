"""
Workflow engine — code-based workflow definitions.

Instead of database models (overkill for fixed status sets), workflows are
defined in Python as WorkflowConfig objects with TransitionDef entries.

Inspired by ERPNext's Workflow model, but lighter — no DB overhead.

Usage:
    ORDER_WORKFLOW = WorkflowConfig(
        status_field="status",
        transitions=[
            TransitionDef("N", "D", label="Перевести в Договор", allowed_groups=["otm", "admin"]),
            TransitionDef("D", "P", label="Запустить производство", condition=has_paid_advance),
            ...
        ],
    )
"""

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class TransitionDef:
    """Definition of a single allowed status transition."""

    from_status: str
    to_status: str
    label: str = ""
    # Groups that can perform this transition (empty = any authenticated user)
    allowed_groups: list[str] = field(default_factory=list)
    # Callable(instance, user) -> None, raises ConditionNotMet if not met
    condition: Callable[..., None] | None = None
    # CSS color hint for the frontend button
    color: str = ""


@dataclass
class WorkflowConfig:
    """Complete workflow definition for a model."""

    status_field: str
    transitions: list[TransitionDef]

    def get_transitions_from(self, from_status: str) -> list[TransitionDef]:
        """Get all transitions available from a given status."""
        return [t for t in self.transitions if t.from_status == from_status]

    def get_transition(self, from_status: str, to_status: str) -> TransitionDef | None:
        """Get a specific transition if it exists."""
        for t in self.transitions:
            if t.from_status == from_status and t.to_status == to_status:
                return t
        return None

    def get_status_labels(self) -> dict[str, str]:
        """Extract unique status labels from transitions."""
        labels = {}
        for t in self.transitions:
            if t.label and t.to_status not in labels:
                labels[t.to_status] = t.label
        return labels
