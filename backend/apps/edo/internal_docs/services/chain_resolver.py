"""ChainResolver — резолв `role_key` строк из ApprovalChainTemplate.steps в конкретных User'ов.

Синтаксис и семантика — ТЗ §3.4 + §15.0:
    supervisor
    author
    dept_head:self | dept_head:parent | dept_head:up(N)
    company_head
    group:<name>[@company]
    group_head:<name>[@company]
    fixed_user:<id>
    field_user:<field_name>
    field_dept_head:<field_name>

Все резолверы детерминированы: при прочих равных возвращают сотрудника с
ранней фамилией (order_by last_name, first_name, id). Это важно, чтобы
chain_snapshot не менялся между попытками submit'а.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()

_UP_RE = re.compile(r"^up\((\d+)\)$")


class ResolveError(Exception):
    """Обязательный шаг цепочки не удалось резолвнуть."""


@dataclass
class ResolveContext:
    author: Any  # User instance
    field_values: dict[str, Any]


Resolver = Callable[[ResolveContext, str], Any | None]

_resolvers: dict[str, Resolver] = {}


def register(prefix: str) -> Callable[[Resolver], Resolver]:
    """Регистрация резолвера по префиксу role_key."""

    def _wrap(fn: Resolver) -> Resolver:
        _resolvers[prefix] = fn
        return fn

    return _wrap


def resolve(role_key: str, author, field_values: dict | None = None):
    """Возвращает `User` или `None`. Неизвестный префикс → ResolveError."""
    if not role_key or not isinstance(role_key, str):
        raise ResolveError(f"role_key must be a non-empty string, got {role_key!r}")
    ctx = ResolveContext(author=author, field_values=field_values or {})
    prefix, _, args = role_key.partition(":")
    prefix = prefix.strip()
    args = args.strip()
    handler = _resolvers.get(prefix)
    if handler is None:
        raise ResolveError(f"Unknown role_key prefix: {prefix!r} (in {role_key!r})")
    return handler(ctx, args)


# ========== концретные резолверы ==========


@register("supervisor")
def _supervisor(ctx: ResolveContext, _args: str):
    return ctx.author.resolve_supervisor()


@register("author")
def _author(ctx: ResolveContext, _args: str):
    return ctx.author


@register("company_head")
def _company_head(ctx: ResolveContext, _args: str):
    """Директор компании автора. Двухступенчатый резолв:

    1. Primary: `User.is_department_head=True` + `department_unit IS NULL`
       — пользователь, явно сидящий «на уровне компании», без подразделения.
    2. Fallback: head корневого Department в этой компании. Это покрывает
       типовую org-структуру, где директор сидит в Department «Руководство»
       (или равнозначном) на верхушке дерева, а не вне дерева вовсе.

    Если ни первый, ни второй вариант не дают результата — возвращает None,
    и шаг с `action=approve/sign` упадёт с ResolveError при submit'е.
    """
    if not ctx.author.company_unit_id:
        return None

    # 1) Primary: company-level head (department_unit=NULL).
    head = (
        User.objects.filter(
            company_unit_id=ctx.author.company_unit_id,
            department_unit__isnull=True,
            is_department_head=True,
            is_active=True,
        )
        .exclude(pk=ctx.author.pk)
        .order_by("last_name", "first_name", "pk")
        .first()
    )
    if head is not None:
        return head

    # 2) Fallback: head корневого (depth=1) Department в этой компании.
    # MP_Node treebeard: roots имеют depth=1.
    from apps.directory.models import Department

    root_dept_ids = list(
        Department.objects.filter(company_id=ctx.author.company_unit_id, depth=1, is_active=True).values_list(
            "pk", flat=True
        )
    )
    if not root_dept_ids:
        return None
    return (
        User.objects.filter(
            company_unit_id=ctx.author.company_unit_id,
            department_unit_id__in=root_dept_ids,
            is_department_head=True,
            is_active=True,
        )
        .exclude(pk=ctx.author.pk)
        .order_by("last_name", "first_name", "pk")
        .first()
    )


@register("dept_head")
def _dept_head(ctx: ResolveContext, args: str):
    """args: 'self' | 'parent' | 'up(N)'. Ищет head начиная с указанного узла,
    рекурсивно поднимаясь по дереву, если head в нём не нашёлся.
    """
    dept = ctx.author.department_unit
    if dept is None:
        return None

    target = None
    if args == "self":
        target = dept
    elif args == "parent":
        target = dept.get_parent()
    else:
        m = _UP_RE.match(args)
        if not m:
            raise ResolveError(f"dept_head args must be 'self'/'parent'/'up(N)', got {args!r}")
        n = int(m.group(1))
        if n <= 0:
            raise ResolveError(f"dept_head up(N) requires N>=1, got {n}")
        node = dept
        for _ in range(n):
            if node is None:
                break
            node = node.get_parent()
        target = node

    # Если target = None (up(N) вышел за корень) — сразу fallback на company.
    if target is None:
        return _company_head(ctx, "")

    # Ищем head начиная с target, поднимаясь по дереву.
    node = target
    while node is not None:
        head = (
            User.objects.filter(
                department_unit=node,
                is_department_head=True,
                is_active=True,
            )
            .exclude(pk=ctx.author.pk)
            .order_by("last_name", "first_name", "pk")
            .first()
        )
        if head is not None:
            return head
        node = node.get_parent()

    # Дошли до корня дерева Department — fallback на head компании.
    return _company_head(ctx, "")


@register("group")
def _group(ctx: ResolveContext, args: str):
    """args: 'name' или 'name@company'. Scope @company ограничивает пользователем
    той же компании, что и автор.
    """
    name, _, scope = args.partition("@")
    name = name.strip()
    if not name:
        raise ResolveError("group: requires group name")
    qs = User.objects.filter(groups__name=name, is_active=True).exclude(pk=ctx.author.pk)
    if scope == "company":
        if not ctx.author.company_unit_id:
            return None
        qs = qs.filter(company_unit_id=ctx.author.company_unit_id)
    return qs.order_by("last_name", "first_name", "pk").first()


@register("group_head")
def _group_head(ctx: ResolveContext, args: str):
    """Member группы с флагом is_department_head=True."""
    name, _, scope = args.partition("@")
    name = name.strip()
    if not name:
        raise ResolveError("group_head: requires group name")
    qs = User.objects.filter(
        groups__name=name,
        is_department_head=True,
        is_active=True,
    ).exclude(pk=ctx.author.pk)
    if scope == "company":
        if not ctx.author.company_unit_id:
            return None
        qs = qs.filter(company_unit_id=ctx.author.company_unit_id)
    return qs.order_by("last_name", "first_name", "pk").first()


@register("fixed_user")
def _fixed_user(ctx: ResolveContext, args: str):
    try:
        pk = int(args)
    except (TypeError, ValueError) as e:
        raise ResolveError(f"fixed_user requires numeric id, got {args!r}") from e
    return User.objects.filter(pk=pk, is_active=True).first()


@register("field_user")
def _field_user(ctx: ResolveContext, args: str):
    """Резолв User из field_values[field_name]. Значение может быть int или str(int)."""
    if not args:
        raise ResolveError("field_user requires field name")
    val = ctx.field_values.get(args)
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None
    return User.objects.filter(pk=pk, is_active=True).first()


@register("dept_head_type")
def _dept_head_type(ctx: ResolveContext, args: str):
    """Head ближайшего Department с заданным `unit_type`, поднимаясь от
    `author.department_unit` вверх по дереву.

    args — это значение `Department.UnitType` (management / division / service /
    department / sector / bureau / group / site / laboratory / branch / other).

    В отличие от `dept_head:up(N)`, не зависит от глубины автора: всегда
    находит «ближайший вверх» узел нужного типа. Удобно для цепочек уровня
    «директор управления / дирекции / службы», которые могут быть на разной
    высоте у разных авторов.

    Если в дереве нет узла нужного типа или у него нет head'а — None.
    """
    if not args:
        raise ResolveError("dept_head_type requires unit_type argument")
    if not ctx.author.department_unit_id:
        return None

    node = ctx.author.department_unit
    while node is not None:
        if node.unit_type == args:
            head = (
                User.objects.filter(
                    department_unit=node,
                    is_department_head=True,
                    is_active=True,
                )
                .exclude(pk=ctx.author.pk)
                .order_by("last_name", "first_name", "pk")
                .first()
            )
            if head is not None:
                return head
        node = node.get_parent()
    return None


@register("field_user_supervisor")
def _field_user_supervisor(ctx: ResolveContext, args: str):
    """Непосредственный руководитель пользователя, на которого указывает FK-поле `args`.

    Используется в обратных потоках (vacation_notification): автор —
    бухгалтерия, employee — отдельное поле формы; нужно уведомить именно
    руководителя сотрудника, а не автора.
    """
    if not args:
        raise ResolveError("field_user_supervisor requires field name")
    val = ctx.field_values.get(args)
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None
    target = User.objects.filter(pk=pk, is_active=True).first()
    if target is None:
        return None
    return target.resolve_supervisor()


@register("field_dept_head")
def _field_dept_head(ctx: ResolveContext, args: str):
    """Head of Department, на который ссылается field_values[field_name]."""
    if not args:
        raise ResolveError("field_dept_head requires field name")
    val = ctx.field_values.get(args)
    if val in (None, "", []):
        return None
    try:
        pk = int(val)
    except (TypeError, ValueError):
        return None

    from apps.directory.models import Department

    dept = Department.objects.filter(pk=pk, is_active=True).first()
    if dept is None:
        return None
    node = dept
    while node is not None:
        head = (
            User.objects.filter(
                department_unit=node,
                is_department_head=True,
                is_active=True,
            )
            .exclude(pk=ctx.author.pk)
            .order_by("last_name", "first_name", "pk")
            .first()
        )
        if head is not None:
            return head
        node = node.get_parent()
    return None


# ========== построение цепочки ==========

NON_BLOCKING_ACTIONS = {"inform", "notify_only"}


# Объяснения для админа: что нужно настроить, чтобы конкретный role_key начал
# резолвиться. Сообщения добавляются к ResolveError при submit'е документа.
_RESOLVE_HINTS: dict[str, str] = {
    "supervisor": (
        "Назначьте автору непосредственного руководителя: либо явно через "
        "User.supervisor (Django admin), либо проставьте кому-то в его "
        "department_unit (или родительском) флаг is_department_head=True."
    ),
    "company_head": (
        "Не найден директор компании. Варианты: "
        "(а) создать пользователя с company_unit=<компания>, department_unit=NULL, "
        "is_department_head=True; "
        "(б) проставить is_department_head=True пользователю в корневом Department "
        "компании (например, в «Руководство»)."
    ),
    "dept_head": (
        "В дереве Department автора нет ни одного пользователя с is_department_head=True. "
        "Проставьте флаг руководителю подразделения через Django admin."
    ),
    "dept_head_type": (
        "В дереве Department автора нет узла указанного unit_type, либо у этого узла нет "
        "head-пользователя. Проверьте дерево подразделений и проставьте is_department_head."
    ),
}


def _format_unresolved(role_key: str, label: str, order: int, author) -> str:
    prefix = role_key.partition(":")[0]
    hint = _RESOLVE_HINTS.get(prefix, "")
    msg = (
        f"Шаг #{order} «{label}» (role_key={role_key}) не удалось резолвить "
        f"для автора {author.get_full_name() or author.pk}."
    )
    if hint:
        msg += " " + hint
    return msg


@dataclass
class ResolvedStep:
    order: int
    role_key: str
    role_label: str
    action: str
    sla_hours: int | None
    parallel_group: str
    parallel_mode: str  # "and" | "or" (игнорируется, если parallel_group=="")
    approver: Any | None  # User or None (for non-blocking unresolvable)


def build_approval_steps(
    chain_steps: list[dict],
    author,
    field_values: dict | None = None,
    *,
    dedupe: bool = True,
) -> list[ResolvedStep]:
    """Резолвит всю цепочку согласования.

    - Раскрывает каждый шаг в `ResolvedStep(approver=User|None)`.
    - Если `dedupe=True`, скипает шаги, где approver уже встречался выше
      (кроме параллельных групп — там все независимы).
    - Для обязательных шагов (action=approve/sign) с approver=None → ResolveError.
    - Для inform/notify_only шагов approver=None разрешён — информационный
      шаг просто не создаётся.
    """
    field_values = field_values or {}
    result: list[ResolvedStep] = []
    seen_approvers: set[int] = set()

    for raw in chain_steps:
        if not isinstance(raw, dict):
            raise ResolveError(f"chain step must be dict, got {type(raw).__name__}")
        role_key = str(raw.get("role_key") or "")
        action = str(raw.get("action") or "approve")
        label = str(raw.get("label") or role_key)
        order = int(raw.get("order") or 0)
        sla_hours = raw.get("sla_hours")
        parallel_group = str(raw.get("parallel_group") or "")
        parallel_mode = str(raw.get("parallel_mode") or "and").lower()
        if parallel_mode not in ("and", "or"):
            raise ResolveError(
                f"chain step {order} has invalid parallel_mode={parallel_mode!r} (must be 'and' or 'or')"
            )

        if not role_key:
            raise ResolveError(f"chain step {order} is missing role_key")

        user = resolve(role_key, author, field_values)

        if user is None:
            if action in NON_BLOCKING_ACTIONS:
                logger.info(
                    "Skipping non-blocking step order=%s role=%s (unresolvable)",
                    order,
                    role_key,
                )
                continue
            raise ResolveError(_format_unresolved(role_key, label, order, author))

        if dedupe and not parallel_group and user.pk in seen_approvers:
            logger.info(
                "Skipping duplicate approver %s at step order=%s role=%s",
                user.pk,
                order,
                role_key,
            )
            continue

        seen_approvers.add(user.pk)
        result.append(
            ResolvedStep(
                order=order,
                role_key=role_key,
                role_label=label,
                action=action,
                sla_hours=sla_hours,
                parallel_group=parallel_group,
                parallel_mode=parallel_mode,
                approver=user,
            )
        )

    return result
