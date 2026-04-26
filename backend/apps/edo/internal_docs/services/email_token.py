"""Подписанные токены для email-link согласования.

Сценарий: согласующему приходит email с двумя кнопками — Согласовать /
Отклонить. Каждая ведёт на публичную страницу `/edo/approve/<token>/`,
которая через POST вызывает соответствующую action. Логин не нужен —
авторизация доказывается через подпись токена.

Безопасность:
- Подпись на основе SECRET_KEY (TimestampSigner).
- Salt привязан к версии токена и роли — нельзя подменить approve→reject.
- TTL: 14 дней (типичный SLA-цикл; если документ дольше, согласующий
  всё равно увидит его в ЛК).
- Токен одноразовый: при использовании step должен быть PENDING + approver
  должен совпадать. После approve/reject шаг не PENDING — повторное
  использование токена даст 400.
"""

from __future__ import annotations

from typing import Literal

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

ACTION_APPROVE: Literal["approve"] = "approve"
ACTION_REJECT: Literal["reject"] = "reject"
VALID_ACTIONS = {ACTION_APPROVE, ACTION_REJECT}

_SALT = "edo.internal_docs.email_action.v1"
TOKEN_MAX_AGE_SECONDS = 14 * 24 * 3600  # 14 дней


class InvalidEmailToken(Exception):
    pass


def make_token(step_id: int, action: str) -> str:
    """Создаёт подписанный токен для (step_id, action)."""
    if action not in VALID_ACTIONS:
        raise ValueError(f"Invalid action {action!r}: must be approve|reject")
    payload = f"{int(step_id)}:{action}"
    return TimestampSigner(salt=_SALT).sign(payload)


def parse_token(token: str) -> tuple[int, str]:
    """Распаковывает токен → (step_id, action). Бросает InvalidEmailToken на:
    - испорченную/чужую подпись;
    - просроченный токен (старше TOKEN_MAX_AGE_SECONDS);
    - неверный формат полезной нагрузки.
    """
    try:
        payload = TimestampSigner(salt=_SALT).unsign(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired as e:
        raise InvalidEmailToken("token expired") from e
    except BadSignature as e:
        raise InvalidEmailToken("invalid signature") from e

    sid_str, _, action = payload.partition(":")
    if not sid_str or action not in VALID_ACTIONS:
        raise InvalidEmailToken(f"bad token payload: {payload!r}")
    try:
        return int(sid_str), action
    except ValueError as e:
        raise InvalidEmailToken("step_id must be integer") from e
