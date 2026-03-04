# project/app/utils/pdf_parser.py
from __future__ import annotations
from typing import List, Dict, Any
import pdfplumber
import io
from .elements import (
    make_text_element, make_table_element, make_image_element, 
    make_signature_element, make_divider_element, is_likely_signature
)

def parse_pdf(file_obj) -> Dict[str, Any]:
    elements: List[Dict[str, Any]] = []
    
    current_y_offset = 0
    # PDF coordinates are in points (1/72 inch). Web is approx 96 DPI.
    # Scale factor 1.33 maps PDF points to likely CSS pixels.
    SCALE = 1.33 

    plain_text_parts = []

    try:
        with pdfplumber.open(file_obj) as pdf:
            for page in pdf.pages:
                page_height = page.height
                
                # --- 1. ТАБЛИЦЫ ---
                # Находим таблицы, чтобы потом исключить текст внутри них
                tables = page.find_tables()
                table_rects = []

                for table in tables:
                    bbox = table.bbox
                    table_rects.append(bbox) # (x0, top, x1, bottom)
                    
                    # Извлекаем данные таблицы
                    raw_data = table.extract()
                    if not raw_data: 
                        continue
                    
                    # Обрабатываем и нормализуем данные таблицы
                    processed_data = _process_table_data(raw_data)
                    if not processed_data:
                        continue

                    # Извлекаем цвета текста из ячеек таблицы
                    cell_colors = _extract_table_cell_colors(table, page, processed_data)

                    x = bbox[0] * SCALE
                    y = (bbox[1] * SCALE) + current_y_offset
                    w = (bbox[2] - bbox[0]) * SCALE
                    h = (bbox[3] - bbox[1]) * SCALE
                    
                    # Улучшаем высоту таблицы - добавляем минимальную высоту на строку
                    min_row_height = 30  # Минимальная высота строки
                    calculated_height = max(h, len(processed_data) * min_row_height)
                    
                    elements.append(make_table_element(
                        x=max(0, x), y=y, width=w, height=int(calculated_height),
                        data=processed_data, cell_text_colors=cell_colors
                    ))

                # --- 2. КАРТИНКИ И ПОДПИСИ ---
                for img in page.images:
                    x0, top, x1, bottom = img['x0'], img['top'], img['x1'], img['bottom']
                    w_px = (x1 - x0) * SCALE
                    h_px = (bottom - top) * SCALE
                    
                    # Фильтр мусора
                    if w_px < 5 or h_px < 5: continue

                    try:
                        # Самый надежный способ достать картинку в pdfplumber - кропнуть и сохранить
                        cropped_page = page.crop((x0, top, x1, bottom))
                        # to_image создает объект Image из библиотеки PIL (pypdfium2 wrapper)
                        # resolution=150 достаточно для экрана
                        pil_image = cropped_page.to_image(resolution=150).original
                        
                        buf = io.BytesIO()
                        pil_image.save(buf, format="PNG")
                        img_bytes = buf.getvalue()
                        
                        final_x = x0 * SCALE
                        final_y = (top * SCALE) + current_y_offset

                        if is_likely_signature(w_px, h_px):
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

                # --- 3. ЛИНИИ (РАЗДЕЛИТЕЛИ) ---
                for line in page.lines:
                    # Горизонтальные линии
                    if abs(line['top'] - line['bottom']) < 2 and (line['x1'] - line['x0']) > 50:
                        elements.append(make_divider_element(
                            x=line['x0'] * SCALE,
                            y=(line['top'] * SCALE) + current_y_offset,
                            width=(line['x1'] - line['x0']) * SCALE,
                            thickness=max(1, line.get('linewidth', 1)),
                            color="#000000" # PDF цвета линий сложно достать напрямую в hex
                        ))

                # --- 4. ТЕКСТ ---
                words = page.extract_words(extra_attrs=['fontname', 'size', 'non_stroking_color'])
                
                # Группируем слова в строки
                lines_dict = {}
                for w in words:
                    # Проверяем, не внутри ли таблицы
                    cx, cy = w['x0'], w['top']
                    in_table = False
                    for tr in table_rects:
                        if tr[0] <= cx <= tr[2] and tr[1] <= cy <= tr[3]:
                            in_table = True
                            break
                    if in_table: continue

                    # Группируем по Y с допуском 3 пункта
                    y_key = int(w['top'] // 3) * 3
                    lines_dict.setdefault(y_key, []).append(w)

                sorted_y_keys = sorted(lines_dict.keys())
                
                for y_key in sorted_y_keys:
                    line_words = sorted(lines_dict[y_key], key=lambda x: x['x0'])
                    if not line_words: continue

                    first = line_words[0]
                    text_content = " ".join([wd['text'] for wd in line_words])
                    plain_text_parts.append(text_content)

                    # Стили
                    font_size = float(first.get('size', 12)) * SCALE
                    is_bold = "Bold" in str(first.get('fontname', ''))
                    is_italic = "Italic" in str(first.get('fontname', ''))
                    
                    # Цвет
                    color = "#000000"
                    sc = first.get('non_stroking_color')
                    if sc and isinstance(sc, (list, tuple)) and len(sc) >= 3:
                        r, g, b = [int(c * 255) for c in sc[:3]]
                        color = "#{:02x}{:02x}{:02x}".format(r, g, b)

                    # Улучшенный расчет высоты текста
                    # Минимальная высота строки с учетом межстрочного интервала
                    min_line_height = max(20, font_size * 1.6)  # Увеличенный коэффициент
                    # Оцениваем количество строк в тексте
                    estimated_lines = max(1, len(text_content) / 50)  # Примерно 50 символов на строку
                    calculated_height = max(min_line_height, estimated_lines * min_line_height)
                    
                    elements.append(make_text_element(
                        x=first['x0'] * SCALE,
                        y=(first['top'] * SCALE) + current_y_offset,
                        width=(line_words[-1]['x1'] - first['x0']) * SCALE + 10,
                        height=int(calculated_height),
                        content=text_content,
                        size=max(8, int(font_size)),
                        bold=is_bold,
                        italic=is_italic,
                        color=color
                    ))

                # Отступ для следующей страницы
                current_y_offset += (page_height * SCALE) + 40

        return {"elements": elements, "text": "\n".join(plain_text_parts)}

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

def _extract_table_cell_colors(table, page, processed_data: List[List[str]]) -> List[List[str]]:
    """Извлечение цветов текста из ячеек таблицы PDF"""
    cell_colors = []
    
    try:
        # Получаем слова внутри таблицы с цветами
        bbox = table.bbox
        words = page.extract_words(
            x0=bbox[0], top=bbox[1], x1=bbox[2], bottom=bbox[3],
            extra_attrs=['non_stroking_color']
        )
        
        # Инициализируем цвета по умолчанию
        rows = len(processed_data)
        cols = len(processed_data[0]) if processed_data else 0
        cell_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
        
        # Получаем границы ячеек таблицы
        cells = table.cells
        if not cells:
            return cell_colors
        
        # Сопоставляем слова с ячейками
        for word in words:
            word_x = (word['x0'] + word['x1']) / 2
            word_y = (word['top'] + word['bottom']) / 2
            word_color = "#000000"
            
            # Извлекаем цвет слова
            sc = word.get('non_stroking_color')
            if sc and isinstance(sc, (list, tuple)) and len(sc) >= 3:
                r, g, b = [int(c * 255) for c in sc[:3]]
                word_color = "#{:02x}{:02x}{:02x}".format(r, g, b)
            
            # Находим ячейку, в которой находится слово
            for row_idx, row in enumerate(cells):
                if row_idx >= len(cell_colors):
                    continue
                for col_idx, cell_bbox in enumerate(row):
                    if col_idx >= len(cell_colors[row_idx]):
                        continue
                    if (cell_bbox[0] <= word_x <= cell_bbox[2] and 
                        cell_bbox[1] <= word_y <= cell_bbox[3]):
                        # Если цвет не черный, используем его
                        if word_color != "#000000":
                            cell_colors[row_idx][col_idx] = word_color
                        break
    except Exception as e:
        print(f"Error extracting table cell colors: {e}")
        # Возвращаем цвета по умолчанию
        rows = len(processed_data)
        cols = len(processed_data[0]) if processed_data else 0
        cell_colors = [["#000000" for _ in range(cols)] for _ in range(rows)]
    
    return cell_colors
