"""Серверная генерация HTML из editor_content — единственный источник правды.

Логика симметрична фронтовому редактору: абсолютное позиционирование внутри
.canvas-print 794x1123 (A4 @ 96dpi). PDFExportService превращает этот HTML в PDF
через Playwright. Фронт больше не шлёт html_content.
"""
from __future__ import annotations

import html as html_lib
import re
from typing import Any, Iterable

from .normalization import normalize_editor_content

CANVAS_WIDTH = 794  # px, A4 @ 96dpi
CANVAS_MIN_HEIGHT = 1123

_PLACEHOLDER_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def _esc(value: Any) -> str:
    return html_lib.escape("" if value is None else str(value), quote=True)


def _esc_attr(value: Any) -> str:
    """Значение для атрибута (src, alt). Не экранируем data: URL-ы лишний раз."""
    return html_lib.escape("" if value is None else str(value), quote=True)


def _apply_placeholders(text: str, values: dict[str, Any]) -> str:
    if not text or not values:
        return text or ""

    def _sub(match: re.Match[str]) -> str:
        key = match.group(1)
        return "" if values.get(key) is None else str(values[key])

    return _PLACEHOLDER_RE.sub(_sub, text)


def _substitute_element(element: dict[str, Any], values: dict[str, Any]) -> dict[str, Any]:
    """Подставляет плейсхолдеры в текстовые поля элемента (до рендера HTML)."""
    if not values:
        return element

    props = dict(element.get("properties") or {})
    el_type = element.get("type")

    if el_type == "text":
        if "content" in props:
            props["content"] = _apply_placeholders(props.get("content") or "", values)
    elif el_type == "signature":
        if "text" in props:
            props["text"] = _apply_placeholders(props.get("text") or "", values)
    elif el_type == "table":
        cells = props.get("cells")
        if isinstance(cells, list):
            new_cells = []
            for row in cells:
                if not isinstance(row, list):
                    new_cells.append(row)
                    continue
                new_row = []
                for cell in row:
                    if isinstance(cell, dict) and "content" in cell:
                        new_cell = dict(cell)
                        new_cell["content"] = _apply_placeholders(cell.get("content") or "", values)
                        new_row.append(new_cell)
                    else:
                        new_row.append(cell)
                new_cells.append(new_row)
            props["cells"] = new_cells
        data = props.get("data")
        if isinstance(data, list):
            props["data"] = [
                [_apply_placeholders(c or "", values) if isinstance(c, str) else c for c in (row or [])]
                for row in data
            ]

    return {**element, "properties": props}


def _common_style(el: dict[str, Any]) -> str:
    return (
        f"position:absolute;"
        f"left:{int(el.get('x', 0))}px;"
        f"top:{int(el.get('y', 0))}px;"
        f"width:{int(el.get('width', 100))}px;"
        f"height:{int(el.get('height', 40))}px;"
    )


def _render_text(el: dict[str, Any]) -> str:
    p = el.get("properties") or {}
    style = _common_style(el)
    p_style = (
        f"margin:0;"
        f"font-family:{_esc(p.get('fontFamily') or 'Arial')};"
        f"font-size:{int(p.get('fontSize') or 14)}px;"
        f"color:{_esc(p.get('color') or '#000')};"
        f"font-weight:{'bold' if p.get('bold') else 'normal'};"
        f"font-style:{'italic' if p.get('italic') else 'normal'};"
        f"text-decoration:{'underline' if p.get('underline') else 'none'};"
        f"text-align:{_esc(p.get('align') or 'left')};"
        f"line-height:{p.get('lineHeight') or 1.5};"
        f"letter-spacing:{int(p.get('letterSpacing') or 0)}px;"
        f"text-indent:{int(p.get('textIndent') or 0)}px;"
        f"white-space:{_esc(p.get('whiteSpace') or 'pre-wrap')};"
        f"word-break:{_esc(p.get('wordBreak') or 'break-word')};"
    )
    content = _esc(p.get("content") or "")
    return f'<div style="{style}"><p style="{p_style}">{content}</p></div>'


def _render_signature(el: dict[str, Any]) -> str:
    p = el.get("properties") or {}
    style = _common_style(el)
    if p.get("image"):
        return (
            f'<div style="{style}">'
            f'<img src="{_esc_attr(p["image"])}" alt="signature" '
            f'style="width:100%;height:100%;object-fit:contain;" /></div>'
        )
    return (
        f'<div style="{style}display:flex;align-items:center;justify-content:center;'
        f'border-bottom:1px solid #000;">'
        f'<span style="font-size:{int(p.get("fontSize") or 14)}px;'
        f'color:{_esc(p.get("color") or "#000")};">{_esc(p.get("text") or "")}</span>'
        f'</div>'
    )


def _render_image(el: dict[str, Any]) -> str:
    p = el.get("properties") or {}
    style = _common_style(el)
    src = p.get("src") or ""
    if not src:
        return f'<div style="{style}"></div>'
    return (
        f'<div style="{style}">'
        f'<img src="{_esc_attr(src)}" alt="{_esc_attr(p.get("alt") or "")}" '
        f'style="width:100%;height:100%;object-fit:contain;" /></div>'
    )


def _render_divider(el: dict[str, Any]) -> str:
    p = el.get("properties") or {}
    style = _common_style(el)
    thickness = int(p.get("thickness") or 1)
    color = _esc(p.get("color") or "#000")
    border_style = _esc(p.get("style") or "solid")
    return (
        f'<div style="{style}">'
        f'<hr style="border:none;border-top:{thickness}px {border_style} {color};margin:0;" /></div>'
    )


def _render_table(el: dict[str, Any]) -> str:
    p = el.get("properties") or {}
    style = _common_style(el)
    border_width = int(p.get("borderWidth") or 1)
    border_color = _esc(p.get("borderColor") or "#000")
    cell_bg = _esc(p.get("cellBg") or "transparent")

    cells = p.get("cells")
    columns = p.get("columns")
    if isinstance(cells, list) and isinstance(columns, list) and cells:
        col_widths = [max(1, int((c or {}).get("width") or 0)) for c in columns]
        total = sum(col_widths) or 1
        col_percents = [f"{(w / total) * 100:.4f}%" for w in col_widths]

        table_html = [
            f'<table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed;">'
        ]
        table_html.append("<colgroup>")
        for pct in col_percents:
            table_html.append(f'<col style="width:{pct};" />')
        table_html.append("</colgroup>")
        for row in cells:
            if not isinstance(row, list):
                continue
            table_html.append("<tr>")
            for cell in row:
                if not isinstance(cell, dict):
                    cell = {"content": ""}
                cell_style_obj = (cell.get("style") or {}) if isinstance(cell.get("style"), dict) else {}
                cell_style = (
                    f"border:{border_width}px solid {border_color};"
                    f"background:{cell_bg};"
                    f"padding:2px 4px;"
                    f"color:{_esc(cell_style_obj.get('color') or '#000')};"
                    f"text-align:{_esc(cell_style_obj.get('textAlign') or 'left')};"
                    f"font-weight:{_esc(cell_style_obj.get('fontWeight') or 'normal')};"
                    f"word-break:break-word;"
                )
                rowspan = int(cell.get("rowSpan") or 1)
                colspan = int(cell.get("colSpan") or 1)
                span_attrs = ""
                if rowspan > 1:
                    span_attrs += f' rowspan="{rowspan}"'
                if colspan > 1:
                    span_attrs += f' colspan="{colspan}"'
                table_html.append(
                    f'<td style="{cell_style}"{span_attrs}>{_esc(cell.get("content") or "")}</td>'
                )
            table_html.append("</tr>")
        table_html.append("</table>")
        return f'<div style="{style}">{"".join(table_html)}</div>'

    rows = max(1, int(p.get("rows") or 1))
    cols = max(1, int(p.get("cols") or 1))
    data = p.get("data") if isinstance(p.get("data"), list) else []
    color_matrix = p.get("cellTextColors") if isinstance(p.get("cellTextColors"), list) else []

    table_html = [
        f'<table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed;">'
    ]
    for r in range(rows):
        table_html.append("<tr>")
        for c in range(cols):
            cell_text = ""
            if r < len(data) and isinstance(data[r], list) and c < len(data[r]):
                cell_text = data[r][c] or ""
            color = "#000"
            if r < len(color_matrix) and isinstance(color_matrix[r], list) and c < len(color_matrix[r]):
                color = color_matrix[r][c] or "#000"
            cell_style = (
                f"border:{border_width}px solid {border_color};"
                f"background:{cell_bg};"
                f"padding:2px 4px;"
                f"color:{_esc(color)};"
                f"word-break:break-word;"
            )
            table_html.append(f'<td style="{cell_style}">{_esc(cell_text)}</td>')
        table_html.append("</tr>")
    table_html.append("</table>")
    return f'<div style="{style}">{"".join(table_html)}</div>'


_RENDERERS = {
    "text": _render_text,
    "signature": _render_signature,
    "image": _render_image,
    "divider": _render_divider,
    "table": _render_table,
}


def _canvas_height(elements: Iterable[dict[str, Any]]) -> int:
    max_bottom = CANVAS_MIN_HEIGHT
    for el in elements:
        bottom = int(el.get("y") or 0) + int(el.get("height") or 0)
        if bottom > max_bottom:
            max_bottom = bottom
    return max_bottom


def render_editor_content_html(
    editor_content: Any,
    values: dict[str, Any] | None = None,
) -> str:
    """Рендерит editor_content в HTML, готовый для Playwright/превью.

    Плейсхолдеры вида {{ var }} подставляются на уровне `element.properties.content`
    ДО сериализации в HTML — так они не ломаются об экранирование.
    """
    normalized = normalize_editor_content(editor_content)
    values = values or {}
    substituted = [_substitute_element(el, values) for el in normalized]

    height = _canvas_height(substituted)
    parts = [
        f'<div class="canvas-print" '
        f'style="position:relative;width:{CANVAS_WIDTH}px;min-height:{height}px;'
        f'background:white;margin:0 auto;">'
    ]
    for el in substituted:
        renderer = _RENDERERS.get(el.get("type"))
        if renderer is None:
            continue
        try:
            parts.append(renderer(el))
        except Exception:
            # Один кривой элемент не должен ронять весь документ.
            continue
    parts.append("</div>")
    return "".join(parts)
