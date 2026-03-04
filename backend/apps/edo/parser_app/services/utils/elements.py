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
            "align": align
        }
    }

def make_table_element(x, y, width, height, table=None, rows=2, cols=2, data=None, cell_text_colors=None):
    final_data = []
    final_colors = []
    
    # Если переданы сырые данные (из PDF/HTML)
    if data:
        final_data = data
        rows = len(data)
        cols = len(data[0]) if data else 0
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
        rows = len(final_data)
        cols = len(final_data[0]) if final_data else 0
        final_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
    else:
        final_data = [["" for _ in range(cols)] for _ in range(rows)]
        final_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]

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
            "cellTextColors": final_colors
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
