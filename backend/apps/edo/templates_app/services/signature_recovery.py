"""Восстановление data-URL картинок подписей, потерянных в editor_content
из-за старого "плоского" формата сохранения. html_content их сохранял, поэтому
можно вытащить оттуда и залить обратно в editor_content по совпадению координат.
"""

from __future__ import annotations

import re
from typing import Any

_LEFT_RE = re.compile(r"left\s*:\s*(-?\d+(?:\.\d+)?)\s*px", re.IGNORECASE)
_TOP_RE = re.compile(r"top\s*:\s*(-?\d+(?:\.\d+)?)\s*px", re.IGNORECASE)

POSITION_TOLERANCE_PX = 6  # небольшая погрешность на rounding


def _extract_positioned_data_images(html: str) -> list[tuple[int, int, str]]:
    """Находит все <img src="data:image/...">, сидящие внутри <div> с абсолютными
    координатами. Возвращает список (left, top, data_url).
    """
    if not html:
        return []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []

    soup = BeautifulSoup(html, "html.parser")
    found: list[tuple[int, int, str]] = []
    for img in soup.find_all("img"):
        src = img.get("src") or ""
        if not src.startswith("data:image/"):
            continue
        parent = img.parent
        while parent is not None and parent.name != "div":
            parent = parent.parent
        if parent is None:
            continue
        style = parent.get("style") or ""
        left_match = _LEFT_RE.search(style)
        top_match = _TOP_RE.search(style)
        if not left_match or not top_match:
            continue
        try:
            left = int(round(float(left_match.group(1))))
            top = int(round(float(top_match.group(1))))
        except ValueError:
            continue
        found.append((left, top, src))
    return found


def recover_signatures(editor_content: list[dict[str, Any]], html_content: str) -> list[dict[str, Any]]:
    """Для каждой подписи без image ищет ближайшую по координатам data-картинку
    в html_content и проставляет её как properties.image. Возвращает обновлённый
    editor_content (новый список, исходный не мутируется).
    """
    if not editor_content or not html_content:
        return editor_content

    orphans = [
        (idx, el)
        for idx, el in enumerate(editor_content)
        if isinstance(el, dict) and el.get("type") == "signature" and not ((el.get("properties") or {}).get("image"))
    ]
    if not orphans:
        return editor_content

    candidates = _extract_positioned_data_images(html_content)
    if not candidates:
        return editor_content

    used: set[int] = set()
    result = [dict(el) if isinstance(el, dict) else el for el in editor_content]

    for idx, el in orphans:
        ex, ey = int(el.get("x") or 0), int(el.get("y") or 0)
        best: tuple[int, int] | None = None  # (cand_index, distance_sq)
        for ci, (cx, cy, _src) in enumerate(candidates):
            if ci in used:
                continue
            dx = cx - ex
            dy = cy - ey
            if abs(dx) > POSITION_TOLERANCE_PX or abs(dy) > POSITION_TOLERANCE_PX:
                continue
            dist = dx * dx + dy * dy
            if best is None or dist < best[1]:
                best = (ci, dist)
        if best is None:
            continue
        ci, _ = best
        used.add(ci)
        _, _, data_url = candidates[ci]
        props = dict(result[idx].get("properties") or {})
        props["image"] = data_url
        result[idx] = {**result[idx], "properties": props}

    return result
