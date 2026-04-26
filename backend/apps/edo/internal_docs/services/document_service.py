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

_UNSET = object()


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


def update_draft(document: Document, *, field_values=None, title=None, addressee=_UNSET) -> Document:
    """Обновляет поля черновика. Разрешено только в draft/revision_requested.

    Передача `addressee=None` явно очищает поле; по умолчанию (sentinel) — не трогает.
    """
    if document.status not in (Document.Status.DRAFT, Document.Status.REVISION_REQUESTED):
        raise DocumentServiceError(
            f"Cannot edit document in status {document.status!r}"
        )
    update_fields: list[str] = []
    if field_values is not None:
        document.field_values = field_values
        update_fields.append("field_values")
    if title is not None:
        document.title = title
        update_fields.append("title")
    if addressee is not _UNSET:
        document.addressee = addressee
        update_fields.append("addressee")
    if update_fields:
        document.save(update_fields=update_fields)
    return document


# ========== submit (draft → pending) ==========


def _build_header_snapshot(author) -> dict:
    """Снимает «шапку» документа: компания + директор на момент submit.

    Директор берётся из OrgUnitHead-справочника по active_for(today). Если
    запись не найдена — оставляем пустые строки; PDF в таком случае не
    показывает блок «Кому».
    """
    from apps.directory.models import OrgUnitHead

    company = author.company_unit or (author.department_unit.company if author.department_unit_id else None)
    if company is None:
        return {}
    head = OrgUnitHead.active_for(company)
    return {
        "company_name": company.name,
        "company_full_name": getattr(company, "full_name", "") or company.name,
        "head_name": head.head_name if head else "",
        "head_position": head.head_position if head else "",
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

    # 7. Создаём ApprovalStep'ы — все в WAITING. Удаляем любые старые, если это re-submit.
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
            parallel_mode=(r.parallel_mode or ApprovalStep.ParallelMode.AND),
            role_key=r.role_key,
            role_label=r.role_label,
            action=r.action,
            approver=r.approver,
            status=ApprovalStep.Status.WAITING,
            sla_due_at=_sla_due_at(now, r.sla_hours, default_sla),
        )
        created_steps.append(step)

    # 8. Активируем первый batch (переводит первую пачку WAITING → PENDING,
    # auto-завершает inform-шаги перед ней; событие approval_requested
    # генерируется внутри).
    trigger_event("document.submitted", instance=document, user=user)
    _activate_next_batch(document, after_order=-1)

    logger.info("Submitted document %s (number %s)", document.pk, document.number)
    return document


# ========== approve / reject / request_revision ==========

ACTIVE_ACTIONS = (ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN)
INFORM_ACTIONS = (ApprovalStep.Action.INFORM, ApprovalStep.Action.NOTIFY_ONLY)


def _get_step_batch(step: ApprovalStep) -> list[ApprovalStep]:
    """Все шаги, относящиеся к тому же batch'у согласования, что и `step`.

    Batch = набор шагов одного `parallel_group` (если он непустой).
    Sequential-шаг — batch из самого себя.
    Возвращаются ВСЕ шаги batch'а (включая уже закрытые), для проверки
    AND/OR-условий завершения.
    """
    if not step.parallel_group:
        return [step]
    return list(
        step.document.steps.filter(parallel_group=step.parallel_group).order_by("order", "pk")
    )


def _is_batch_complete(batch: list[ApprovalStep]) -> bool:
    """`True`, если batch достиг условия завершения по своему `parallel_mode`.

    AND: все участники в финальном статусе approve/skipped.
    OR: хотя бы один approve. (Reject в OR режиме НЕ останавливает batch —
    остальные могут согласовать; целиком rejected считается, когда ВСЕ rejected.)
    """
    if not batch:
        return True
    mode = batch[0].parallel_mode or ApprovalStep.ParallelMode.AND
    if mode == ApprovalStep.ParallelMode.OR:
        return any(s.status == ApprovalStep.Status.APPROVED for s in batch)
    final = (ApprovalStep.Status.APPROVED, ApprovalStep.Status.SKIPPED)
    return all(s.status in final for s in batch)


def _is_batch_all_rejected(batch: list[ApprovalStep]) -> bool:
    """В OR-режиме: все участники отклонили → документ отклонён."""
    return bool(batch) and all(s.status == ApprovalStep.Status.REJECTED for s in batch)


def _get_user_pending_step(document: Document, user) -> ApprovalStep:
    """Возвращает PENDING active-шаг, назначенный пользователю (или его группе).

    Поддерживает два режима:
    - персональный: step.approver == user
    - групповой: step.role_key == 'group:NAME[@company]' и user в группе NAME

    При групповом resolution-е переназначаем step.approver = user (silent
    pickup), чтобы в истории зафиксировалось, кто конкретно принял решение.

    Только PENDING-шаги, поэтому WAITING (ещё не активные параллельные
    или последующие шаги) автоматически отфильтровываются.
    """
    pending = (
        document.steps
        .filter(status=ApprovalStep.Status.PENDING, action__in=ACTIVE_ACTIONS)
        .order_by("order", "pk")
    )

    direct = pending.filter(approver=user).first()
    if direct is not None:
        return direct

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
        if s.approver_id != user.pk:
            s.original_approver = s.original_approver or s.approver
            s.approver = user
            s.save(update_fields=["approver", "original_approver", "updated_at"])
        return s

    raise PermissionDenied(
        f"У пользователя {user.pk} нет активных шагов согласования этого документа"
    )


def _activate_next_batch(document: Document, *, after_order: int) -> None:
    """Активирует следующий batch WAITING-шагов (после `after_order`).

    1. Auto-completes inform/notify_only шаги перед следующим active-шагом
       (мгновенно ставит APPROVED).
    2. Если active-шагов больше нет — закрывает документ как APPROVED.
    3. Иначе переводит весь batch следующего active-шага (по `parallel_group`
       или одиночный sequential-шаг) из WAITING в PENDING, ставит
       `current_step`, генерирует `document.approval_requested` для каждого.

    Используется и при первичном submit (`after_order=-1`), и после успешного
    закрытия предыдущего batch'а.
    """
    waiting = (
        document.steps
        .filter(status=ApprovalStep.Status.WAITING, order__gt=after_order)
        .order_by("order", "pk")
    )

    # 1. Находим первый active-WAITING шаг.
    next_active = waiting.filter(action__in=ACTIVE_ACTIONS).first()
    now = timezone.now()

    # 2. Auto-завершаем все inform-шаги ПЕРЕД ним (или все, если active больше нет).
    informs_qs = waiting.filter(action__in=INFORM_ACTIONS)
    if next_active is not None:
        informs_qs = informs_qs.filter(order__lt=next_active.order)
    informs_qs.update(status=ApprovalStep.Status.APPROVED, decided_at=now)

    if next_active is None:
        # Активных больше нет → документ согласован.
        document.current_step = None
        document.status = Document.Status.APPROVED
        document.closed_at = now
        document.save(update_fields=["current_step", "status", "closed_at"])
        trigger_event("document.approved", instance=document)
        return

    # 3. Активируем batch следующего active-шага.
    if next_active.parallel_group:
        batch = list(
            waiting
            .filter(parallel_group=next_active.parallel_group, action__in=ACTIVE_ACTIONS)
            .order_by("order", "pk")
        )
    else:
        batch = [next_active]

    for s in batch:
        # Если у назначенного approver'а активен замещающий — переводим шаг
        # на него, фиксируя original_approver. Делаем именно при активации,
        # а не при submit'е: в момент создания черновика отпуск approver'а
        # может ещё не наступить.
        _maybe_apply_substitute(s)
        s.status = ApprovalStep.Status.PENDING
        s.save(update_fields=["status", "approver", "original_approver", "updated_at"])

    document.current_step = batch[0]
    document.save(update_fields=["current_step"])

    for s in batch:
        trigger_event("document.approval_requested", instance=document, step=s)


def _maybe_apply_substitute(step: ApprovalStep) -> None:
    """In-place: если approver в отпуске → переводит шаг на substitute_user."""
    if not step.approver_id:
        return
    sub = step.approver.get_active_substitute()
    if sub is None or sub.pk == step.approver_id:
        return
    step.original_approver = step.original_approver or step.approver
    step.approver = sub


@transaction.atomic
def approve(
    document: Document,
    user,
    *,
    comment: str = "",
    signature_image: str = "",
) -> ApprovalStep:
    """Одобрить активный шаг (или личный, или коллективный групповой).

    Логика для batch'а:
    - AND: ждём, пока все остальные шаги batch'а завершатся → переходим дальше.
    - OR: первый approve гасит остальных в batch'е (их статус → SKIPPED) и
      продвигает документ.
    """
    if document.status != Document.Status.PENDING:
        raise DocumentServiceError(f"Cannot approve from status {document.status!r}")

    step = _get_user_pending_step(document, user)

    step.status = ApprovalStep.Status.APPROVED
    step.decided_at = timezone.now()
    step.comment = comment or ""
    if signature_image and document.type.requires_drawn_signature:
        step.signature_image = signature_image
    step.save()

    batch = _get_step_batch(step)

    # OR-batch: первый approve пропускает остальных в batch'е.
    if (
        step.parallel_group
        and step.parallel_mode == ApprovalStep.ParallelMode.OR
    ):
        for sib in batch:
            if sib.pk != step.pk and sib.status == ApprovalStep.Status.PENDING:
                sib.status = ApprovalStep.Status.SKIPPED
                sib.decided_at = step.decided_at
                sib.save(update_fields=["status", "decided_at"])

    # Если batch ещё не завершён (AND и кто-то pending) — ждём остальных.
    batch = _get_step_batch(step)  # перечитываем после возможного skip
    if not _is_batch_complete(batch):
        return step

    # Batch завершён → активируем следующий.
    last_order = max(s.order for s in batch)
    _activate_next_batch(document, after_order=last_order)
    return step


@transaction.atomic
def reject(document: Document, user, *, comment: str) -> ApprovalStep:
    """Отклонить активный шаг.

    Логика для batch'а:
    - AND (или sequential): любой reject → документ сразу REJECTED.
    - OR: reject отмечает только этого согласующего; остальные в batch'е
      продолжают работать. Документ становится REJECTED, только когда
      ВСЕ участники OR-batch'а отклонили.
    """
    if document.status != Document.Status.PENDING:
        raise DocumentServiceError(f"Cannot reject from status {document.status!r}")
    if not comment:
        raise ValidationError("Комментарий обязателен при отклонении")

    step = _get_user_pending_step(document, user)
    step.status = ApprovalStep.Status.REJECTED
    step.decided_at = timezone.now()
    step.comment = comment
    step.save()

    is_or_batch = (
        step.parallel_group
        and step.parallel_mode == ApprovalStep.ParallelMode.OR
    )
    batch = _get_step_batch(step)

    # OR-batch: reject не убивает документ, пока не все отклонили.
    if is_or_batch and not _is_batch_all_rejected(batch):
        return step

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

    step = _get_user_pending_step(document, user)
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
def force_cancel(document: Document, user, *, reason: str) -> Document:
    """Принудительная отмена документа админом. В отличие от `cancel()`:
    - не требует, чтобы `user` был автором;
    - разрешена даже после approve (но не после финального approved/rejected);
    - в комментарий пишется reason — для аудита.
    """
    if document.status in (Document.Status.APPROVED, Document.Status.REJECTED, Document.Status.CANCELLED):
        raise DocumentServiceError(f"Документ уже закрыт (статус: {document.status})")
    if not reason:
        raise ValidationError("Причина обязательна при принудительной отмене")

    document.status = Document.Status.CANCELLED
    document.closed_at = timezone.now()
    document.current_step = None
    document.save(update_fields=["status", "closed_at", "current_step"])
    document.steps.filter(
        status__in=(ApprovalStep.Status.PENDING, ApprovalStep.Status.WAITING),
    ).update(
        status=ApprovalStep.Status.SKIPPED,
        decided_at=timezone.now(),
        comment=f"[Отменено администратором {user.get_full_name() or user.username}: {reason}]",
    )
    trigger_event("document.force_cancelled", instance=document, user=user, reason=reason)
    return document


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
    # Все незакрытые шаги (pending + waiting) помечаем skipped.
    document.steps.filter(
        status__in=(ApprovalStep.Status.PENDING, ApprovalStep.Status.WAITING),
    ).update(
        status=ApprovalStep.Status.SKIPPED,
        decided_at=timezone.now(),
    )
    return document
