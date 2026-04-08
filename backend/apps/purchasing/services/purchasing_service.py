from django.db import transaction

from apps.core.events import trigger_event
from apps.purchasing.models import (
    PurchaseOrder,
    PurchasePayment,
    PurchaseRequest,
)


def submit_request(request: PurchaseRequest, user) -> PurchaseRequest:
    """Подать заявку на закупку (draft → submitted)."""
    if request.status != PurchaseRequest.Status.DRAFT:
        raise ValueError("Можно подать только черновик")
    request.status = PurchaseRequest.Status.SUBMITTED
    request.save(update_fields=["status", "updated_at"])
    trigger_event("purchase_request.submitted", instance=request, user=user)
    return request


def create_order_from_request(
    request: PurchaseRequest,
    supplier,
    purchaser,
) -> PurchaseOrder:
    """Создать закупочный ордер из заявки."""
    with transaction.atomic():
        po = PurchaseOrder.objects.create(
            supplier=supplier,
            order=request.order,
            purchase_request=request,
            purchaser=purchaser,
            status=PurchaseOrder.Status.DRAFT,
        )
        for line in request.lines.all():
            po.lines.create(
                product=line.product,
                name=line.name,
                quantity=line.quantity,
                note=line.note,
            )
        request.status = PurchaseRequest.Status.IN_PROGRESS
        request.save(update_fields=["status", "updated_at"])
        return po


def approve_payment(payment: PurchasePayment, user) -> PurchasePayment:
    """Согласовать оплату (pending_approval → approved)."""
    if payment.status != PurchasePayment.Status.PENDING_APPROVAL:
        raise ValueError("Оплата не на согласовании")
    payment.status = PurchasePayment.Status.APPROVED
    payment.approved_by = user
    payment.save(update_fields=["status", "approved_by", "updated_at"])
    trigger_event("purchase_payment.approved", instance=payment, user=user)
    return payment


def reject_payment(payment: PurchasePayment, user) -> PurchasePayment:
    """Отклонить оплату."""
    if payment.status != PurchasePayment.Status.PENDING_APPROVAL:
        raise ValueError("Оплата не на согласовании")
    payment.status = PurchasePayment.Status.REJECTED
    payment.approved_by = user
    payment.save(update_fields=["status", "approved_by", "updated_at"])
    return payment


def mark_payment_paid(payment: PurchasePayment) -> PurchasePayment:
    """Отметить как оплаченное (approved → paid)."""
    if payment.status != PurchasePayment.Status.APPROVED:
        raise ValueError("Оплата не согласована")
    payment.status = PurchasePayment.Status.PAID
    payment.save(update_fields=["status", "updated_at"])
    return payment
