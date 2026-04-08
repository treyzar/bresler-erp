# project/app/utils/elements.py
import uuid
import base64

def generate_id():
    return f"el_{uuid.uuid4().hex[:8]}"

def is_likely_signature(width: int, height: int) -> bool:
    """
    Эвристика: проверяет, похожа ли картинка на подпись.
    Подписи обычно вытянуты по горизонтали (ratio > 1.2) и не слишком высокие.
    """
    if height == 0: return False
    ratio = width / height
    
    # 1. Пропорции: ширина больше высоты
    # 2. Размеры: не слишком мелкая (иконка) и не слишком огромная (фон)
    is_wide = 1.2 < ratio < 6.0
    is_reasonable_size = 40 < width < 600 and 20 < height < 300
    
    return is_wide and is_reasonable_size

def make_text_element(x, y, width, height, content, font="Inter", size=14, bold=False, italic=False, color="#000000", align="left"):
    return {
        "id": generate_id(),
        "type": "text",
        "x": int(x),
        "y": int(y),
        "width": int(width),
        "height": int(height),
        "zIndex": 1,
        "properties": {
            "content": content,
            "fontFamily": font,
            "fontSize": size,
            "color": color,
            "bold": bold,
            "italic": italic,
            "underline": False,
            "align": align,
            "textIndent": 0,
            "lineHeight": 1.5,
            "letterSpacing": 0,
            "whiteSpace": "pre-wrap",
            "wordBreak": "break-word",
            "paragraphSpacing": 8,
        }
    }

def _normalize_table_data(data):
    if not data:
        return []

    normalized = []
    max_cols = 0
    for row in data:
        if row is None:
            normalized_row = []
        else:
            normalized_row = ["" if cell is None else str(cell) for cell in row]
        max_cols = max(max_cols, len(normalized_row))
        normalized.append(normalized_row)

    for row in normalized:
        while len(row) < max_cols:
            row.append("")
    return normalized


def _build_table_cells(final_data, final_colors):
    cells = []
    for row_idx, row in enumerate(final_data):
        cell_row = []
        for col_idx, value in enumerate(row):
            color = "#000000"
            if row_idx < len(final_colors) and col_idx < len(final_colors[row_idx]):
                color = final_colors[row_idx][col_idx] or "#000000"
            cell_row.append(
                {
                    "id": generate_id(),
                    "content": value,
                    "rowSpan": 1,
                    "colSpan": 1,
                    "style": {
                        "color": color,
                        "textAlign": "left",
                    },
                }
            )
        cells.append(cell_row)
    return cells


def make_table_element(x, y, width, height, table=None, rows=2, cols=2, data=None, cell_text_colors=None):
    final_data = []
    final_colors = []
    
    # Если переданы сырые данные (из PDF/HTML)
    if data:
        final_data = _normalize_table_data(data)
        rows = len(final_data)
        cols = len(final_data[0]) if final_data else 0
        # Инициализируем цвета, если не переданы
        if cell_text_colors:
            final_colors = cell_text_colors
        else:
            final_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
    # Если передан объект docx table
    elif table:
        for row in table.rows:
            row_data = [cell.text.strip() for cell in row.cells]
            final_data.append(row_data)
        final_data = _normalize_table_data(final_data)
        rows = len(final_data)
        cols = len(final_data[0]) if final_data else 0
        final_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
    else:
        final_data = [["" for _ in range(cols)] for _ in range(rows)]
        final_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]

    if rows <= 0:
        rows = len(final_data)
    if cols <= 0 and final_data:
        cols = len(final_data[0])

    columns = []
    if cols > 0:
        safe_width = max(120, int(width))
        base_col_width = max(80, int(safe_width / cols))
        columns = [{"width": base_col_width} for _ in range(cols)]

    cells = _build_table_cells(final_data, final_colors)

    return {
        "id": generate_id(),
        "type": "table",
        "x": int(x),
        "y": int(y),
        "width": int(width),
        "height": int(height),
        "zIndex": 1,
        "properties": {
            "rows": rows,
            "cols": cols,
            "borderWidth": 1,
            "borderColor": "#000000",
            "cellBg": "transparent",
            "data": final_data,
            "cellTextColors": final_colors,
            # Новая структура (совместима с новым редактором таблиц)
            "columns": columns,
            "cells": cells,
        }
    }

def make_image_element(x, y, width, height, image_bytes=None, ext="png", src=None):
    if not src and image_bytes:
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            src = f"data:image/{ext};base64,{b64}"
        except Exception:
            src = ""
    
    return {
        "id": generate_id(),
        "type": "image",
        "x": int(x),
        "y": int(y),
        "width": int(width),
        "height": int(height),
        "zIndex": 0,
        "properties": {
            "src": src or "",
            "alt": "Image"
        }
    }

def make_signature_element(x, y, width, height, image_bytes=None, ext="png", src=None):
    if not src and image_bytes:
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            src = f"data:image/{ext};base64,{b64}"
        except Exception:
            src = ""

    return {
        "id": generate_id(),
        "type": "signature",
        "x": int(x),
        "y": int(y),
        "width": int(width),
        "height": int(height),
        "zIndex": 2,
        "properties": {
            "image": src or "",
            "text": "",
            "fontSize": 16,
            "color": "#000000"
        }
    }

def make_divider_element(x, y, width, thickness=1, color="#000000"):
    return {
        "id": generate_id(),
        "type": "divider",
        "x": int(x),
        "y": int(y),
        "width": int(width),
        "height": 20,
        "zIndex": 1,
        "properties": {
            "thickness": thickness,
            "color": color,
            "style": "solid"
        }
    }
