# project/app/utils/pdf_parser.py
from __future__ import annotations
from typing import List, Dict, Any, Tuple, Optional
import pdfplumber
import io
import re
import unicodedata
from .elements import (
    make_text_element, make_table_element, make_image_element, 
    make_signature_element, make_divider_element, is_likely_signature
)

try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

CID_TOKEN_RE = re.compile(r"\(cid:\d+\)")


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    normalized = CID_TOKEN_RE.sub("", normalized)
    normalized = "".join(ch for ch in normalized if ch == "\n" or ch == "\t" or ord(ch) >= 32)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\s+\n", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _looks_like_garbled_text(text: str) -> bool:
    if not text:
        return False
    cid_hits = len(CID_TOKEN_RE.findall(text))
    if cid_hits >= 2:
        return True
    alnum = sum(1 for ch in text if ch.isalnum())
    if alnum == 0:
        return True
    unknown = sum(1 for ch in text if ch in {"�", "□", "■"})
    return (unknown / max(1, len(text))) > 0.12


def parse_pdf(file_obj) -> Dict[str, Any]:
    elements: List[Dict[str, Any]] = []
    
    current_y_offset = 0
    SCALE = 1.33
    # Для конструктора страницы идут подряд без межстраничного зазора.
    PAGE_GAP = 0
    plain_text_parts = []
    pages_metadata: List[Dict[str, int]] = []

    try:
        with pdfplumber.open(file_obj) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                page_height = page.height
                page_width = page.width
                pages_metadata.append(
                    {
                        "index": page_idx,
                        "width": int(page_width * SCALE),
                        "height": int(page_height * SCALE),
                    }
                )
                
                # --- 1. ТАБЛИЦЫ ---
                tables = page.find_tables()
                table_rects = []

                for table in tables:
                    bbox = table.bbox
                    table_rects.append(bbox)
                    
                    raw_data = table.extract()
                    if not raw_data: 
                        continue
                    
                    processed_data = _process_table_data(raw_data)
                    if not processed_data:
                        continue

                    if HAS_OCR and _table_has_garbled_cells(processed_data):
                        ocr_data = _try_ocr_table_cells(page, bbox, processed_data)
                        if ocr_data:
                            processed_data = ocr_data

                    cell_colors = _extract_table_cell_colors(table, page, processed_data)

                    x = bbox[0] * SCALE
                    y = (bbox[1] * SCALE) + current_y_offset
                    w = (bbox[2] - bbox[0]) * SCALE
                    h = (bbox[3] - bbox[1]) * SCALE
                    
                    min_row_height = 30
                    calculated_height = max(h, len(processed_data) * min_row_height)
                    
                    elements.append(make_table_element(
                        x=max(0, x), y=y, width=w, height=int(calculated_height),
                        data=processed_data, cell_text_colors=cell_colors
                    ))

                # --- 2. КАРТИНКИ И ПОДПИСИ ---
                image_rects = []
                seen_image_boxes = set()
                for img in page.images:
                    x0 = float(img.get("x0", 0))
                    x1 = float(img.get("x1", 0))
                    top = float(img.get("top", img.get("y0", 0)))
                    bottom = float(img.get("bottom", img.get("y1", 0)))
                    if x1 <= x0 or bottom <= top:
                        continue

                    bbox_key = (
                        int(round(x0 * 2)),
                        int(round(top * 2)),
                        int(round(x1 * 2)),
                        int(round(bottom * 2)),
                    )
                    if bbox_key in seen_image_boxes:
                        continue
                    seen_image_boxes.add(bbox_key)

                    image_rects.append((x0, top, x1, bottom))
                    w_px = (x1 - x0) * SCALE
                    h_px = (bottom - top) * SCALE
                    
                    if w_px < 5 or h_px < 5: continue

                    try:
                        cropped_page = page.crop((x0, top, x1, bottom))
                        pil_image = cropped_page.to_image(resolution=150).original
                        
                        buf = io.BytesIO()
                        pil_image.save(buf, format="PNG")
                        img_bytes = buf.getvalue()
                        
                        final_x = x0 * SCALE
                        final_y = (top * SCALE) + current_y_offset

                        if is_likely_signature(int(w_px), int(h_px)):
                            elements.append(make_signature_element(
                                x=final_x, y=final_y, width=w_px, height=h_px,
                                image_bytes=img_bytes
                            ))
                        else:
                            elements.append(make_image_element(
                                x=final_x, y=final_y, width=w_px, height=h_px,
                                image_bytes=img_bytes
                            ))
                    except Exception as e:
                        print(f"Skipping image due to error: {e}")

                # --- 3. ВЕКТОРНЫЕ ПОДПИСИ (рисунки из paths) ---
                # Ищем векторные рисунки, которые могут быть подписями
                paths = page.paths if hasattr(page, 'paths') else []
                signature_candidates = _detect_vector_signatures(paths, SCALE, current_y_offset, table_rects)
                elements.extend(signature_candidates)

                # --- 4. ЛИНИИ (РАЗДЕЛИТЕЛИ) ---
                for line in page.lines:
                    if abs(line['top'] - line['bottom']) < 2 and (line['x1'] - line['x0']) > 50:
                        elements.append(make_divider_element(
                            x=line['x0'] * SCALE,
                            y=(line['top'] * SCALE) + current_y_offset,
                            width=(line['x1'] - line['x0']) * SCALE,
                            thickness=max(1, line.get('linewidth', 1)),
                            color="#000000"
                        ))

                # --- 5. ТЕКСТ ---
                words = page.extract_words(
                    extra_attrs=['fontname', 'size', 'non_stroking_color'],
                    use_text_flow=False
                )

                filtered_words = []
                for word in words:
                    cx = (word['x0'] + word['x1']) / 2
                    cy = (word['top'] + word['bottom']) / 2
                    if _point_in_any_rect(cx, cy, table_rects, margin=3.5):
                        continue
                    if _point_in_any_rect(cx, cy, image_rects, margin=1.5):
                        continue
                    filtered_words.append(word)

                detected_garbled = 0
                detected_total = 0
                page_had_readable_text = False

                for line_words in _group_words_into_lines(filtered_words):
                    for segment in _split_line_into_segments(line_words):
                        first = segment[0]
                        last = segment[-1]
                        text_content = " ".join(w['text'] for w in segment).strip()
                        if not text_content:
                            continue

                        detected_total += 1
                        if _looks_like_garbled_text(text_content):
                            detected_garbled += 1

                        if _looks_like_garbled_text(text_content) and HAS_OCR:
                            text_content = _try_ocr_line(page, segment) or text_content

                        text_content = _normalize_text(text_content)
                        if not text_content:
                            continue

                        page_had_readable_text = True
                        plain_text_parts.append(text_content)

                        font_size = float(first.get('size', 12) or 12) * SCALE
                        is_bold = "Bold" in str(first.get('fontname', ''))
                        is_italic = "Italic" in str(first.get('fontname', ''))
                        color = _to_hex_color(first.get('non_stroking_color'))

                        top = min(w['top'] for w in segment)
                        bottom = max(w['bottom'] for w in segment)
                        line_height = max(20, int((bottom - top) * SCALE) + 8)

                        elements.append(make_text_element(
                            x=first['x0'] * SCALE,
                                y=(top * SCALE) + current_y_offset,
                                width=max(16, (last['x1'] - first['x0']) * SCALE + 8),
                                height=line_height,
                                content=text_content,
                            size=max(8, int(round(font_size))),
                            bold=is_bold,
                            italic=is_italic,
                            color=color
                            ))

                garbled_ratio = (detected_garbled / detected_total) if detected_total else 0
                if (not page_had_readable_text or garbled_ratio >= 0.35) and HAS_OCR:
                    ocr_text = _try_ocr_page(page)
                    if ocr_text:
                        ocr_lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
                        if ocr_lines:
                            ocr_font_size = 13
                            line_h = int(ocr_font_size * 1.7)
                            max_lines = max(1, int((page_height * SCALE - 40) // line_h))
                            chunk = ocr_lines[:max_lines]
                            joined = "\n".join(chunk)
                            plain_text_parts.append(joined)
                            elements.append(
                                make_text_element(
                                    x=16,
                                    y=current_y_offset + 16,
                                    width=max(120, int(page_width * SCALE - 32)),
                                    height=max(32, len(chunk) * line_h + 12),
                                    content=joined,
                                    size=ocr_font_size,
                                )
                            )

                current_y_offset += (page_height * SCALE) + PAGE_GAP

        elements.sort(key=lambda el: (el.get("y", 0), el.get("x", 0), el.get("zIndex", 0)))
        return {
            "elements": elements,
            "text": "\n".join(plain_text_parts),
            "metadata": {
                "pages": pages_metadata,
                "page_gap": PAGE_GAP,
            },
        }

    except Exception as e:
        print(f"PDF Parse Error: {e}")
        return {"elements": [], "text": ""}

def _process_table_data(raw_data: List[List[Any]]) -> List[List[str]]:
    """Обработка и нормализация данных таблицы из PDF"""
    if not raw_data:
        return []
    
    processed = []
    
    for row in raw_data:
        if not row:
            continue
        
        processed_row = []
        for cell in row:
            # Обрабатываем значение ячейки
            if cell is None:
                cell_value = ""
            elif isinstance(cell, str):
                # Очищаем от лишних пробелов и переносов
                cell_value = " ".join(cell.strip().split())
            else:
                # Преобразуем другие типы в строку
                cell_value = str(cell).strip()

            cell_value = _normalize_text(cell_value)
            
            processed_row.append(cell_value)
        
        # Пропускаем полностью пустые строки
        if any(cell.strip() for cell in processed_row if cell):
            processed.append(processed_row)
    
    # Нормализуем количество колонок
    if processed:
        max_cols = max(len(row) for row in processed)
        for row in processed:
            while len(row) < max_cols:
                row.append("")
    
    # Удаляем полностью пустые строки в конце
    while processed and all(not cell.strip() for cell in processed[-1] if cell):
        processed.pop()
    
    return processed if processed else []

def _point_in_any_rect(x: float, y: float, rects: List[Tuple[float, float, float, float]], margin: float = 0.0) -> bool:
    return any(
        (rx0 - margin) <= x <= (rx1 + margin) and (ry0 - margin) <= y <= (ry1 + margin)
        for rx0, ry0, rx1, ry1 in rects
    )


def _table_has_garbled_cells(data: List[List[str]]) -> bool:
    total = 0
    bad = 0
    for row in data:
        for cell in row:
            if not cell:
                continue
            total += 1
            if _looks_like_garbled_text(cell):
                bad += 1
    if total == 0:
        return False
    return (bad / total) >= 0.25


def _try_ocr_table_cells(page, table_bbox: Tuple[float, float, float, float], data: List[List[str]]) -> List[List[str]]:
    rows = len(data)
    cols = max((len(r) for r in data), default=0)
    if rows == 0 or cols == 0:
        return data

    x0, y0, x1, y1 = table_bbox
    table_w = max(1.0, x1 - x0)
    table_h = max(1.0, y1 - y0)
    cell_w = table_w / cols
    cell_h = table_h / rows
    out = [row[:] for row in data]

    for r_idx, row in enumerate(data):
        for c_idx, cell in enumerate(row):
            if not _looks_like_garbled_text(cell):
                continue
            cx0 = x0 + c_idx * cell_w
            cy0 = y0 + r_idx * cell_h
            cx1 = x0 + (c_idx + 1) * cell_w
            cy1 = y0 + (r_idx + 1) * cell_h
            try:
                cropped = page.crop((cx0, cy0, cx1, cy1))
                pil_img = cropped.to_image(resolution=260).original
                ocr = pytesseract.image_to_string(
                    pil_img,
                    lang="rus+eng",
                    config="--oem 1 --psm 6",
                )
                ocr = _normalize_text(ocr)
                if ocr:
                    out[r_idx][c_idx] = ocr
            except Exception:
                continue

    return out

def _group_words_into_lines(words: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: (w.get('top', 0), w.get('x0', 0)))
    lines: List[Dict[str, Any]] = []

    for word in sorted_words:
        top = float(word.get('top', 0))
        size = float(word.get('size', 12) or 12)
        threshold = max(2.0, size * 0.35)

        target_line: Optional[Dict[str, Any]] = None
        for line in lines:
            if abs(top - line['top']) <= max(threshold, line['threshold']):
                target_line = line
                break

        if target_line is None:
            lines.append(
                {
                    'top': top,
                    'threshold': threshold,
                    'words': [word],
                }
            )
            continue

        target_line['words'].append(word)
        target_line['top'] = (target_line['top'] + top) / 2
        target_line['threshold'] = max(target_line['threshold'], threshold)

    return [sorted(line['words'], key=lambda w: w.get('x0', 0)) for line in sorted(lines, key=lambda l: l['top'])]

def _split_line_into_segments(line_words: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    if not line_words:
        return []
    if len(line_words) == 1:
        return [line_words]

    segments: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = [line_words[0]]

    for prev, cur in zip(line_words, line_words[1:]):
        prev_size = float(prev.get('size', 12) or 12)
        gap = float(cur.get('x0', 0)) - float(prev.get('x1', 0))
        split_threshold = max(40.0, prev_size * 2.4)

        if gap > split_threshold:
            segments.append(current)
            current = [cur]
        else:
            current.append(cur)

    if current:
        segments.append(current)
    return segments

def _try_ocr_line(page, segment: List[Dict[str, Any]]) -> str:
    if not HAS_OCR or not segment:
        return ""
    try:
        x0 = min(w['x0'] for w in segment)
        x1 = max(w['x1'] for w in segment)
        top = min(w['top'] for w in segment)
        bottom = max(w['bottom'] for w in segment)

        cropped = page.crop((x0, top, x1, bottom))
        pil_img = cropped.to_image(resolution=300).original
        text = pytesseract.image_to_string(
            pil_img,
            lang='rus+eng',
            config='--oem 1 --psm 7',
        )
        return _normalize_text(text)
    except Exception:
        return ""


def _try_ocr_page(page) -> str:
    if not HAS_OCR:
        return ""
    try:
        pil_img = page.to_image(resolution=260).original
        text = pytesseract.image_to_string(
            pil_img,
            lang='rus+eng',
            config='--oem 1 --psm 6',
        )
        return _normalize_text(text)
    except Exception:
        return ""

def _to_hex_color(color: Any) -> str:
    if color is None:
        return "#000000"

    if isinstance(color, (int, float)):
        c = int(max(0, min(255, round(float(color) * (255 if float(color) <= 1 else 1)))))
        return "#{:02x}{:02x}{:02x}".format(c, c, c)

    if isinstance(color, str):
        normalized = color.strip()
        if normalized.startswith("#") and len(normalized) in (4, 7):
            if len(normalized) == 4:
                return "#" + "".join(ch * 2 for ch in normalized[1:])
            return normalized
        return "#000000"

    if isinstance(color, (list, tuple)):
        if not color:
            return "#000000"
        if len(color) == 1:
            return _to_hex_color(color[0])

        rgb = []
        for component in color[:3]:
            value = float(component)
            if value <= 1:
                value *= 255
            rgb.append(int(max(0, min(255, round(value)))))
        while len(rgb) < 3:
            rgb.append(rgb[-1] if rgb else 0)
        return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])

    return "#000000"

def _detect_vector_signatures(paths, scale, y_offset, table_rects):
    """Обнаружение векторных подписей (рукописных рисунков из paths)"""
    signatures = []
    
    if not paths:
        return signatures
    
    # Группируем paths по близости координат
    path_groups = []
    for path in paths:
        pts = path.get('pts', [])
        if not pts or len(pts) < 2:
            continue
        
        # Вычисляем bbox для path
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        bbox = (min(xs), min(ys), max(xs), max(ys))
        
        # Проверяем, не в таблице ли
        cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
        in_table = any(tr[0] <= cx <= tr[2] and tr[1] <= cy <= tr[3] for tr in table_rects)
        if in_table:
            continue
        
        # Ищем существующую группу или создаем новую
        added = False
        for group in path_groups:
            group_bbox = group['bbox']
            # Если paths близко друг к другу (в пределах 20 пунктов)
            if (abs(bbox[0] - group_bbox[0]) < 20 and abs(bbox[1] - group_bbox[1]) < 20):
                group['paths'].append(path)
                # Обновляем bbox группы
                group['bbox'] = (
                    min(group_bbox[0], bbox[0]),
                    min(group_bbox[1], bbox[1]),
                    max(group_bbox[2], bbox[2]),
                    max(group_bbox[3], bbox[3])
                )
                added = True
                break
        
        if not added:
            path_groups.append({'paths': [path], 'bbox': bbox})
    
    # Создаем элементы подписей из групп
    for group in path_groups:
        bbox = group['bbox']
        w = (bbox[2] - bbox[0]) * scale
        h = (bbox[3] - bbox[1]) * scale
        total_paths = len(group['paths'])
        total_points = sum(len(p.get('pts', [])) for p in group['paths'])
        
        # Более строгий фильтр: убираем случайные маленькие каракули/иконки
        if (
            45 < w < 500
            and 12 < h < 140
            and w > h * 1.1
            and total_paths >= 3
            and total_points >= 24
        ):
            signatures.append(make_signature_element(
                x=bbox[0] * scale,
                y=(bbox[1] * scale) + y_offset,
                width=w,
                height=h,
                image_bytes=None  # Векторная подпись, без изображения
            ))
    
    return signatures

def _extract_table_cell_colors(table, page, processed_data: List[List[str]]) -> List[List[str]]:
    """Извлечение цветов текста из ячеек таблицы PDF"""
    rows = len(processed_data)
    cols = len(processed_data[0]) if processed_data else 0
    cell_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
    
    try:
        bbox = table.bbox
        words = page.extract_words(extra_attrs=['non_stroking_color'])
        words = [
            w for w in words
            if bbox[0] <= (w['x0'] + w['x1']) / 2 <= bbox[2] and bbox[1] <= (w['top'] + w['bottom']) / 2 <= bbox[3]
        ]
        
        cells = table.cells
        if not cells or not words:
            return cell_colors
        
        # cells - плоский список, преобразуем в 2D
        cells_2d = []
        for i in range(0, len(cells), cols):
            cells_2d.append(cells[i:i+cols])
        
        # Сопоставляем слова с ячейками
        for word in words:
            word_x = (word['x0'] + word['x1']) / 2
            word_y = (word['top'] + word['bottom']) / 2
            word_color = "#000000"
            
            sc = word.get('non_stroking_color')
            word_color = _to_hex_color(sc)
            
            # Находим ячейку
            for row_idx, row in enumerate(cells_2d):
                if row_idx >= len(cell_colors):
                    continue
                for col_idx, cell_bbox in enumerate(row):
                    if col_idx >= len(cell_colors[row_idx]):
                        continue
                    if (cell_bbox[0] <= word_x <= cell_bbox[2] and 
                        cell_bbox[1] <= word_y <= cell_bbox[3]):
                        if word_color != "#000000":
                            cell_colors[row_idx][col_idx] = word_color
                        break
    except Exception as e:
        print(f"Error extracting table cell colors: {e}")
    
    return cell_colors
