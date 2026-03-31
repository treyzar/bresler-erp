"""
Workflow definitions for Order and Contract.

Defines allowed status transitions, who can perform them,
and what conditions must be met.
"""

from apps.core.workflow import ConditionNotMet, TransitionDef, WorkflowConfig


# ── Conditions ────────────────────────────────────────────────────────────────

def require_contract_exists(instance, user):
    """Order must have a contract before moving to CONTRACT status."""
    if not hasattr(instance, "contract"):
        raise ConditionNotMet("Необходимо создать контракт перед переводом в статус 'Договор'")
    try:
        _ = instance.contract
    except instance.__class__.contract.RelatedObjectDoesNotExist:
        raise ConditionNotMet("Необходимо создать контракт перед переводом в статус 'Договор'")


def require_advance_paid(instance, user):
    """Contract must have advance paid before starting production."""
    try:
        contract = instance.contract
    except Exception:
        raise ConditionNotMet("Контракт не найден")
    if contract.status == "not_paid":
        raise ConditionNotMet("Необходимо получить аванс, чтобы запустить производство")


def require_ship_date(instance, user):
    """Order must have ship_date filled before marking as shipped."""
    if not instance.ship_date:
        raise ConditionNotMet("Заполните дату отгрузки")


# ── Order workflow ────────────────────────────────────────────────────────────
# N(Новый) → D(Договор) → P(Производство) → C(Собран) → S(Отгружен) → A(Архив)
# Any → A(Архив) — only admin

MANAGER_GROUPS = ["otm", "projects", "admin"]

ORDER_WORKFLOW = WorkflowConfig(
    status_field="status",
    transitions=[
        # Happy path
        TransitionDef("N", "D", label="Перевести в Договор", allowed_groups=MANAGER_GROUPS,
                       condition=require_contract_exists, color="blue"),
        TransitionDef("D", "P", label="Запустить производство", allowed_groups=MANAGER_GROUPS,
                       condition=require_advance_paid, color="indigo"),
        TransitionDef("P", "C", label="Собран", allowed_groups=MANAGER_GROUPS, color="amber"),
        TransitionDef("C", "S", label="Отгрузить", allowed_groups=MANAGER_GROUPS,
                       condition=require_ship_date, color="green"),
        TransitionDef("S", "A", label="В архив", allowed_groups=MANAGER_GROUPS, color="gray"),

        # Archive from any status (admin/manager)
        TransitionDef("N", "A", label="Архивировать", allowed_groups=["admin"], color="gray"),
        TransitionDef("D", "A", label="Архивировать", allowed_groups=["admin"], color="gray"),
        TransitionDef("P", "A", label="Архивировать", allowed_groups=["admin"], color="gray"),
        TransitionDef("C", "A", label="Архивировать", allowed_groups=["admin"], color="gray"),
    ],
)


# ── Contract payment workflow ─────────────────────────────────────────────────

CONTRACT_WORKFLOW = WorkflowConfig(
    status_field="status",
    transitions=[
        TransitionDef("not_paid", "advance_paid", label="Аванс оплачен", color="blue"),
        TransitionDef("advance_paid", "intermediate", label="Промежуточная оплата", color="amber"),
        TransitionDef("intermediate", "fully_paid", label="Полностью оплачен", color="green"),
        # Direct full payment
        TransitionDef("not_paid", "fully_paid", label="Полная оплата", color="green"),
        TransitionDef("advance_paid", "fully_paid", label="Полная оплата", color="green"),
    ],
)
