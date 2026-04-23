"""Жизненный цикл Document: create/submit/approve/reject/delegate/cancel.

Бизнес-логика вынесена из view'ов. Service-функции:
- валидируют допустимость перехода (статус + роль);
- мутируют Document + ApprovalStep атомарно;
- генерируют события через apps/core/events для уведомлений.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.core.events import trigger_event
from apps.core.naming import NamingService

from ..models import (
    ApprovalStep,
    Document,
    DocumentType,
    InternalDocFlowConfig,
)
from .body_renderer import render_body
from .chain_resolver import ResolveError, build_approval_steps

logger = logging.getLogger(__name__)


class DocumentServiceError(Exception):
    """Любая ошибка бизнес-логики документа (нельзя перейти, нет прав и т.п.)."""


# ========== создание черновика ==========


def create_draft(
    *,
    author,
    doc_type: DocumentType,
    field_values: dict | None = None,
    title: str | None = None,
    addressee=None,
) -> Document:
    """Создаёт Document в статусе draft. Проверяет инициатора по DocumentType.initiator_resolver."""
    if not doc_type.is_active:
        raise DocumentServiceError(f"Type {doc_type.code!r} is not active")

    # Проверка прав на инициирование данного типа.
    is_admin = author.groups.filter(name="admin").exists()
    if not is_admin:
        ir = doc_type.initiator_resolver
        if ir == DocumentType.InitiatorResolver.DEPARTMENT_HEAD:
            if not author.is_department_head:
                raise PermissionDenied(
                    f"Тип {doc_type.code!r} может создавать только руководитель подразделения"
                )
        elif ir.startswith("group:"):
            group_name = ir.split(":", 1)[1]
            if not author.groups.filter(name=group_name).exists():
                raise PermissionDenied(
                    f"Тип {doc_type.code!r} может создавать только член группы {group_name!r}"
                )

    doc = Document.objects.create(
        type=doc_type,
        author=author,
        title=title or "",
        field_values=field_values or {},
        addressee=addressee,
        status=Document.Status.DRAFT,
    )
    logger.info("Created draft document id=%s type=%s author=%s", doc.pk, doc_type.code, author.pk)
    return doc


def update_draft(document: Document, *, field_values=None, title=None, addressee=None) -> Document:
    """Обновляет поля черновика. Разрешено только в draft/revision_requested."""
    if document.status not in (Document.Status.DRAFT, Document.Status.REVISION_REQUESTED):
        raise DocumentServiceError(
            f"Cannot edit document in status {document.status!r}"
        )
    if field_values is not None:
        document.field_values = field_values
    if title is not None:
        document.title = title
    if addressee is not None or addressee is None and "addressee" in locals():
        document.addressee = addressee
    document.save(update_fields=["field_values", "title", "addressee", "updated_at"] if hasattr(document, "updated_at") else None)
    return document


# ========== submit (draft → pending) ==========


def _build_header_snapshot(author) -> dict:
    """Снимает «шапку» документа: компания + директор (если есть)."""
    company = author.company_unit or (author.department_unit.company if author.department_unit_id else None)
    if company is None:
        return {}
    return {
        "company_name": company.name,
        "company_full_name": getattr(company, "full_name", "") or company.name,
        # Директор и его должность — в Фазе 3 из OrgUnitHead-справочника. Пока пусто.
        "head_name": "",
        "head_position": "",
    }


def _sla_due_at(base: Any, sla_hours: int | None, default_sla: int) -> Any | None:
    hours = sla_hours if sla_hours not in (None, "") else default_sla
    if not hours:
        return None
    return base + timedelta(hours=int(hours))


@transaction.atomic
def submit(document: Document, user) -> Document:
    """Переход draft/revision_requested → pending.

    Что делаем атомарно:
    1. Валидируем статус + права (автор).
    2. Через ChainResolver.build_approval_steps резолвим всех согласующих.
    3. Замораживаем chain_snapshot, body_rendered, title, header_snapshot.
    4. Создаём ApprovalStep'ы (approve/sign; inform/notify_only скипаем,
       если approver не резолвится).
    5. Присваиваем номер через NamingService.
    6. Ставим current_step и submitted_at.
    7. Генерируем event `document.submitted`.
    """
    if document.author_id != user.pk:
        raise PermissionDenied("Только автор может отправить документ на согласование")
    if document.status not in (Document.Status.DRAFT, Document.Status.REVISION_REQUESTED):
        raise DocumentServiceError(f"Cannot submit from status {document.status!r}")

    doc_type = document.type
    if not doc_type.is_active:
        raise DocumentServiceError(f"Type {doc_type.code!r} is inactive")

    # 1. Резолвим цепочку.
    chain_template = doc_type.default_chain
    try:
        resolved = build_approval_steps(
            chain_template.steps or [],
            author=document.author,
            field_values=document.field_values or {},
        )
    except ResolveError as e:
        raise DocumentServiceError(f"Не удалось собрать цепочку согласования: {e}")

    if not resolved:
        raise DocumentServiceError(
            "Цепочка согласования пуста — документ некому отправить"
        )

    # 2. Рендерим body_rendered и title.
    body_rendered = render_body(
        doc_type.body_template,
        doc_type.field_schema or [],
        document.field_values or {},
        author=document.author,
        document=document,
    )
    title_rendered = render_body(
        doc_type.title_template,
        doc_type.field_schema or [],
        document.field_values or {},
        author=document.author,
        document=document,
    )

    # 3. Снимок шапки.
    header_snapshot = _build_header_snapshot(document.author)

    # 4. Снимок цепочки (то, что было в template, для будущих справок).
    chain_snapshot = list(chain_template.steps or [])

    # 5. Генерируем номер.
    number = NamingService.generate(doc_type.numbering_sequence.name)

    # 6. Обновляем документ.
    document.number = number
    document.title = title_rendered.strip() or document.title
    document.body_rendered = body_rendered
    document.header_snapshot = header_snapshot
    document.chain_snapshot = chain_snapshot
    document.author_company_unit = document.author.company_unit
    document.author_department_unit = document.author.department_unit
    document.submitted_at = timezone.now()
    document.status = Document.Status.PENDING
    document.save()

    # 7. Создаём ApprovalStep'ы. Удаляем любые старые, если это re-submit.
    document.steps.all().delete()
    config = InternalDocFlowConfig.get_solo()
    default_sla = config.default_sla_hours
    now = timezone.now()
    created_steps: list[ApprovalStep] = []
    for r in resolved:
        step = ApprovalStep.objects.create(
            document=document,
            order=r.order,
            parallel_group=r.parallel_group or "",
            role_key=r.role_key,
            role_label=r.role_label,
            action=r.action,
            approver=r.approver,
            status=ApprovalStep.Status.PENDING,
            sla_due_at=_sla_due_at(now, r.sla_hours, default_sla),
        )
        created_steps.append(step)

    # current_step = первый pending из active-action шагов.
    first_active = next(
        (s for s in created_steps if s.action in (ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN)),
        None,
    )
    document.current_step = first_active
    document.save(update_fields=["current_step"])

    trigger_event("document.submitted", instance=document, user=user)
    if first_active:
        trigger_event(
            "document.approval_requested",
            instance=document, step=first_active, user=user,
        )

    logger.info("Submitted document %s (number %s)", document.pk, document.number)
    return document


# ========== approve / reject / request_revision ==========


def _get_current_active_step(document: Document, user) -> ApprovalStep:
    """Возвращает шаг, которого ждёт user'а или группа, в которой состоит user.

    Поддерживает два режима:
    - персональный: step.approver == user
    - групповой: step.role_key == 'group:NAME[@company]' и user в группе NAME

    При групповом resolution-е переназначаем step.approver = user (silent
    pickup), чтобы в истории зафиксировалось, кто конкретно принял решение.
    """
    pending = document.steps.filter(status=ApprovalStep.Status.PENDING).order_by("order")

    # Персональный inbox.
    step = pending.filter(approver=user).first()
    if step is not None:
        return step

    # Групповой inbox: проверяем все pending шаги.
    user_groups = set(user.groups.values_list("name", flat=True))
    for s in pending:
        rk = s.role_key or ""
        if not rk.startswith("group:"):
            continue
        group_name, _, scope = rk[len("group:"):].partition("@")
        if group_name not in user_groups:
            continue
        if scope == "company":
            if not user.company_unit_id or document.author_company_unit_id != user.company_unit_id:
                continue
        # Silent pickup: фиксируем фактического исполнителя.
        if s.approver_id != user.pk:
            s.original_approver = s.original_approver or s.approver
            s.approver = user
            s.save(update_fields=["approver", "original_approver", "updated_at"])
        return s

    raise PermissionDenied(
        f"У пользователя {user.pk} нет активных шагов согласования этого документа"
    )


def _advance_to_next_step(document: Document) -> None:
    """Продвигает document.current_step на следующий активный шаг или закрывает документ."""
    active_actions = (ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN)
    next_step = (
        document.steps
        .filter(
            status=ApprovalStep.Status.PENDING,
            action__in=active_actions,
        )
        .order_by("order")
        .first()
    )
    if next_step is not None:
        document.current_step = next_step
        document.save(update_fields=["current_step"])
        trigger_event(
            "document.approval_requested",
            instance=document, step=next_step,
        )
    else:
        # Не осталось активных шагов → документ согласован.
        document.current_step = None
        document.status = Document.Status.APPROVED
        document.closed_at = timezone.now()
        document.save(update_fields=["current_step", "status", "closed_at"])
        trigger_event("document.approved", instance=document)


@transaction.atomic
def approve(
    document: Document,
    user,
    *,
    comment: str = "",
    signature_image: str = "",
) -> ApprovalStep:
    """Одобрить текущий шаг согласования."""
    if document.status != Document.Status.PENDING:
        raise DocumentServiceError(f"Cannot approve from status {document.status!r}")

    step = _get_current_active_step(document, user)

    step.status = ApprovalStep.Status.APPROVED
    step.decided_at = timezone.now()
    step.comment = comment or ""
    if signature_image and document.type.requires_drawn_signature:
        step.signature_image = signature_image
    step.save()

    # Для inform/notify_only шагов — автопометка approved, но без блокировки.
    # Они идут по порядку: если между этим approve и next active шагом есть
    # inform-шаги, отмечаем их сразу.
    _auto_complete_intermediate_informs(document, after_order=step.order)

    _advance_to_next_step(document)
    return step


def _auto_complete_intermediate_informs(document: Document, after_order: int) -> None:
    """Между active-шагами ставим inform-шаги как 'approved' автоматически."""
    informs = document.steps.filter(
        status=ApprovalStep.Status.PENDING,
        action__in=(ApprovalStep.Action.INFORM, ApprovalStep.Action.NOTIFY_ONLY),
        order__gt=after_order,
    ).order_by("order")
    # Берём только те, которые идут ПЕРЕД следующим active-шагом.
    next_active_order = (
        document.steps
        .filter(
            status=ApprovalStep.Status.PENDING,
            action__in=(ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN),
            order__gt=after_order,
        )
        .order_by("order")
        .values_list("order", flat=True)
        .first()
    )
    now = timezone.now()
    for info in informs:
        if next_active_order is not None and info.order > next_active_order:
            break
        info.status = ApprovalStep.Status.APPROVED
        info.decided_at = now
        info.save(update_fields=["status", "decided_at"])


@transaction.atomic
def reject(document: Document, user, *, comment: str) -> ApprovalStep:
    """Отклонить документ — финальный статус."""
    if document.status != Document.Status.PENDING:
        raise DocumentServiceError(f"Cannot reject from status {document.status!r}")
    if not comment:
        raise ValidationError("Комментарий обязателен при отклонении")

    step = _get_current_active_step(document, user)
    step.status = ApprovalStep.Status.REJECTED
    step.decided_at = timezone.now()
    step.comment = comment
    step.save()

    document.status = Document.Status.REJECTED
    document.closed_at = timezone.now()
    document.current_step = None
    document.save(update_fields=["status", "closed_at", "current_step"])
    trigger_event("document.rejected", instance=document, step=step, user=user)
    return step


@transaction.atomic
def request_revision(document: Document, user, *, comment: str) -> ApprovalStep:
    """Запросить правки — документ возвращается автору в revision_requested."""
    if document.status != Document.Status.PENDING:
        raise DocumentServiceError(f"Cannot request revision from status {document.status!r}")
    if not comment:
        raise ValidationError("Комментарий обязателен при запросе правок")

    step = _get_current_active_step(document, user)
    step.status = ApprovalStep.Status.REVISION_REQUESTED
    step.decided_at = timezone.now()
    step.comment = comment
    step.save()

    document.status = Document.Status.REVISION_REQUESTED
    # current_step снимаем, чтобы автор не путался — resubmit создаст новые шаги.
    document.current_step = None
    document.save(update_fields=["status", "current_step"])
    trigger_event("document.revision_requested", instance=document, step=step, user=user)
    return step


# ========== delegate ==========


@transaction.atomic
def delegate(step: ApprovalStep, from_user, to_user) -> ApprovalStep:
    """Делегировать шаг другому согласующему."""
    if step.approver_id != from_user.pk:
        raise PermissionDenied("Делегировать можно только свой шаг")
    if step.status != ApprovalStep.Status.PENDING:
        raise DocumentServiceError(f"Cannot delegate step in status {step.status!r}")
    if from_user.pk == to_user.pk:
        raise ValidationError("Нельзя делегировать самому себе")
    if not to_user.is_active:
        raise ValidationError(f"Пользователь {to_user.pk} неактивен")

    step.original_approver = step.original_approver or from_user
    step.approver = to_user
    # Статус остаётся pending; решение теперь принимает to_user.
    step.save(update_fields=["approver", "original_approver", "updated_at"])
    trigger_event(
        "document.delegated",
        instance=step.document, step=step, from_user=from_user, to_user=to_user,
    )
    return step


# ========== cancel (автор забирает документ) ==========


@transaction.atomic
def cancel(document: Document, user) -> Document:
    """Автор отменяет документ до первого approve."""
    if document.author_id != user.pk:
        raise PermissionDenied("Отменить документ может только его автор")
    if document.status not in (Document.Status.DRAFT, Document.Status.PENDING, Document.Status.REVISION_REQUESTED):
        raise DocumentServiceError(f"Cannot cancel from status {document.status!r}")

    # Нельзя отозвать, если уже есть хоть одно approved.
    if document.steps.filter(status=ApprovalStep.Status.APPROVED).exists():
        raise DocumentServiceError(
            "Нельзя отменить документ после первого одобрения — запросите правки"
        )

    document.status = Document.Status.CANCELLED
    document.closed_at = timezone.now()
    document.current_step = None
    document.save(update_fields=["status", "closed_at", "current_step"])
    # Все pending-шаги помечаем skipped.
    document.steps.filter(status=ApprovalStep.Status.PENDING).update(
        status=ApprovalStep.Status.SKIPPED,
        decided_at=timezone.now(),
    )
    return document
