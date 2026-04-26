"""Кастомный email согласующему: подписанные ссылки Approve / Reject + ссылка в систему.

Шлётся напрямую через `send_mail` в дополнение к bell-уведомлению. Учитывает
пользовательские preferences (если email-канал отключён — не шлёт)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from apps.notifications.models import NotificationPreference

from ..models import ApprovalStep
from .email_token import ACTION_APPROVE, ACTION_REJECT, make_token

logger = logging.getLogger(__name__)


def _build_email_action_url(token: str) -> str:
    """Полный URL до публичной endpoint'ы; SITE_URL — фронтовый домен."""
    base = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
    return f"{base}/edo/email-action/{token}/"


def _user_email_enabled(user, pref_field: str = "approval_requested") -> bool:
    """Проверяет, можно ли слать email по этой категории события."""
    if not user.email:
        return False
    try:
        pref = NotificationPreference.objects.filter(user=user).first()
    except Exception:
        pref = None
    if pref is None or not hasattr(pref, "is_email_enabled"):
        return True  # дефолт — слать
    try:
        return pref.is_email_enabled(pref_field)
    except Exception:
        return True


def send_approval_request_email(step: ApprovalStep) -> bool:
    """Отправляет approver'у письмо с двумя ссылками (Approve / Reject).

    Возвращает True, если письмо ушло; False, если skip (нет email, отключено
    в prefs и т.п.). Любая ошибка отправки логируется и НЕ пробрасывается —
    падать вызывающему обработчику не должно.
    """
    if not step.approver_id:
        return False
    user = step.approver
    if not _user_email_enabled(user, "approval_requested"):
        return False

    document = step.document
    approve_url = _build_email_action_url(make_token(step.pk, ACTION_APPROVE))
    reject_url = _build_email_action_url(make_token(step.pk, ACTION_REJECT))
    base = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
    in_system_url = f"{base}/edo/documents/{document.pk}/" if base else ""

    subject = f"Bresler ERP: на согласование — {document.number or document.title}"

    body = (
        f"Здравствуйте, {user.get_short_name() or user.username}!\n\n"
        f"Документ {document.number or '(черновик)'} «{document.title}» "
        f"ожидает вашего решения.\n"
        f"Ваш шаг: {step.role_label}\n\n"
        f"— Согласовать одной кнопкой:\n  {approve_url}\n\n"
        f"— Отклонить (потребуется комментарий):\n  {reject_url}\n\n"
    )
    if in_system_url:
        body += f"Открыть в системе: {in_system_url}\n\n"
    body += "Ссылки действительны 14 дней; одноразовые.\n"

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
    except Exception:
        logger.exception("Failed to send approval email to %s", user.email)
        return False
