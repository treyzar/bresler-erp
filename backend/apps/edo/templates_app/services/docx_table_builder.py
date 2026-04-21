import logging
from docx.shared import Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DocxTableBuilder:
    @staticmethod
    def set_visual_borders(table):
        """Устанавливает реальные границы таблицы в XML Word."""
        tbl = table._tbl
        tbl_pr = tbl.xpath('w:tblPr')[0]
        borders = OxmlElement('w:tblBorders')
        for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            b = OxmlElement(f'w:{side}')
            b.set(qn('w:val'), 'single')
            b.set(qn('w:sz'), '4') # 1/2 pt (sz is in 1/8 pt)
            b.set(qn('w:color'), '000000')
            borders.append(b)
        tbl_pr.append(borders)

    @staticmethod
    def apply_cell_style(word_cell, style_dict):
        """Применяет стили из JSON к ячейке Word."""
        if not style_dict:
            return
            
        paragraph = word_cell.paragraphs[0]
        
        # Выравнивание текста
        align = style_dict.get('textAlign')
        if align == 'center':
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif align == 'right':
            paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        elif align == 'justify':
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

        # Фон ячейки (Shading)
        bg_color = style_dict.get('backgroundColor')
        if bg_color and bg_color.startswith('#'):
            shading_elm = OxmlElement('w:shd')
            shading_elm.set(qn('w:fill'), bg_color.replace('#', ''))
            word_cell._tc.get_or_add_tcPr().append(shading_elm)
            
        # Шрифт (применяем к run-ам)
        if paragraph.runs:
            run = paragraph.runs[0]
            if style_dict.get('fontWeight') == 'bold':
                run.bold = True
            
            font_size = style_dict.get('fontSize')
            if font_size:
                run.font.size = Pt(font_size)
            
            text_color = style_dict.get('color')
            if text_color and text_color.startswith('#'):
                r = int(text_color[1:3], 16)
                g = int(text_color[3:5], 16)
                b = int(text_color[5:7], 16)
                run.font.color.rgb = RGBColor(r, g, b)

    @classmethod
    def render_table(cls, doc, table_data: Dict[str, Any], values: Dict[str, Any]):
        """Рендерит таблицу. Принимает либо элемент целиком (с `properties`), либо
        уже «распакованный» dict со свойствами таблицы."""
        # Поддерживаем оба формата: {"properties": {...}} и плоский.
        if isinstance(table_data.get("properties"), dict):
            table_data = table_data["properties"]
        cells_data = table_data.get('cells', [])
        if not cells_data:
            logger.warning("DocxTableBuilder: No cells data provided.")
            return

        num_rows = len(cells_data)
        # Определяем количество колонок по метаданным или по первой строке данных
        columns_meta = table_data.get('columns', [])
        num_cols = len(columns_meta) if columns_meta else len(cells_data[0])

        if num_rows == 0 or num_cols == 0:
            logger.warning(f"DocxTableBuilder: Invalid table dimensions: {num_rows}x{num_cols}")
            return

        # Создаем таблицу в Word
        table = doc.add_table(rows=num_rows, cols=num_cols)
        # Принудительно задаем границы через XML
        cls.set_visual_borders(table)

        # 1. Задаем ширину колонок (если фронт их прислал)
        for idx, col_meta in enumerate(columns_meta):
            if idx < len(table.columns):
                # Перевод пикселей с фронта в пункты Word
                width_px = col_meta.get('width', 100)
                table.columns[idx].width = Pt(width_px)

        # 2. Заполнение контента и объединение ячеек
        for r_idx, row in enumerate(cells_data):
            for c_idx, cell_info in enumerate(row):
                if not cell_info:
                    continue

                try:
                    word_cell = table.cell(r_idx, c_idx)
                    
                    # Подстановка переменных {{ variable }}
                    content = str(cell_info.get('content', '') or '')
                    for k, v in values.items():
                        v_str = "" if v is None else str(v)
                        content = content.replace(f"{{{{{k}}}}}", v_str).replace(f"{{{{ {k} }}}}", v_str)
                    
                    word_cell.text = content
                    
                    # Применяем стили (шрифт, выравнивание, фон)
                    cls.apply_cell_style(word_cell, cell_info.get('style', {}))

                    # Логика объединения (Аналог MS Office Merge)
                    row_span = cell_info.get('rowSpan', 1)
                    col_span = cell_info.get('colSpan', 1)

                    if row_span > 1 or col_span > 1:
                        # Находим целевую ячейку для слияния
                        target_r = min(r_idx + row_span - 1, num_rows - 1)
                        target_c = min(c_idx + col_span - 1, num_cols - 1)
                        
                        if target_r != r_idx or target_c != c_idx:
                            target_cell = table.cell(target_r, target_c)
                            word_cell.merge(target_cell)
                except Exception as e:
                    logger.error(f"Error rendering cell ({r_idx}, {c_idx}): {e}")
                    continue
