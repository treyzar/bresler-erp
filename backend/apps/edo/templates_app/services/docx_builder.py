import io
import logging
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from .docx_table_builder import DocxTableBuilder

logger = logging.getLogger(__name__)

class DocxBuilderService:
    Y_TOLERANCE = 15  # Погрешность в пикселях для группировки элементов в одну строку

    @classmethod
    def build_from_json(cls, editor_content: list, values: dict = None) -> bytes:
        """
        Преобразует JSON-координаты элементов в структурированный DOCX
        используя алгоритм пространственной сортировки (Spatial Sorting).
        """
        doc = Document()
        values = values or {}

        if not editor_content:
            logger.warning("DocxBuilder: No editor content provided.")
            return b""

        try:
            # 1. Сортируем все элементы сверху вниз (по Y)
            sorted_by_y = sorted(editor_content, key=lambda e: float(e.get('y', 0)))

            # 2. Группируем элементы в визуальные строки (rows)
            rows = []
            if sorted_by_y:
                current_row = [sorted_by_y[0]]
                current_base_y = float(sorted_by_y[0].get('y', 0))

                for el in sorted_by_y[1:]:
                    el_y = float(el.get('y', 0))
                    # Если разница по Y в пределах допуска, считаем что это одна строка
                    if abs(el_y - current_base_y) <= cls.Y_TOLERANCE:
                        current_row.append(el)
                    else:
                        rows.append(current_row)
                        current_row = [el]
                        current_base_y = el_y
                if current_row:
                    rows.append(current_row)

            # 3. Обрабатываем каждую строку
            for row in rows:
                # Сортируем элементы внутри строки слева направо (по X)
                row.sort(key=lambda e: float(e.get('x', 0)))
                
                # Создаем новый параграф для каждой строки
                p = doc.add_paragraph()
                
                # Устанавливаем выравнивание по первому элементу строки (опционально)
                # Если в строке только один элемент и он сдвинут вправо, можно выровнять параграф
                if len(row) == 1:
                    align = row[0].get('align', 'left')
                    if align == 'center':
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    elif align == 'right':
                        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

                for idx, el in enumerate(row):
                    el_type = el.get('type')
                    content = str(el.get('content', '') or '')
                    
                    # Подстановка переменных {{ variable }}
                    for k, v in values.items():
                        v_str = "" if v is None else str(v)
                        # Поддерживаем оба формата: {{name}} и {{ name }}
                        content = content.replace(f"{{{{{k}}}}}", v_str).replace(f"{{{{ {k} }}}}", v_str)

                    # Добавление в параграф
                    if el_type == 'text':
                        run = p.add_run(content)
                        if el.get('isBold'):
                            run.bold = True
                        if el.get('isItalic'):
                            run.italic = True

                        fontSize = el.get('fontSize')
                        if fontSize:
                            run.font.size = Pt(float(fontSize))

                    elif el_type == 'signature':
                        run = p.add_run("[МЕСТО ДЛЯ ПОДПИСИ]")
                        run.bold = True

                    elif el_type == 'table':
                        # Удаляем пустой параграф, созданный выше, если таблица - единственный элемент в строке
                        # Или просто рендерим таблицу. python-docx добавляет таблицы как блоки.
                        DocxTableBuilder.render_table(doc, el, values)

                    # Имитация горизонтального отступа между элементами в одной строке
                    if el_type != 'table' and idx < len(row) - 1:
                        # Если между элементами большой разрыв по X, добавляем табы
                        gap = float(row[idx+1].get('x', 0)) - (float(el.get('x', 0)) + float(el.get('width', 0)))
                        if gap > 50:
                            p.add_run('\t\t')
                        else:
                            p.add_run('\t')

            # Сохраняем результат в буфер
            buffer = io.BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            return buffer.read()

        except Exception as e:
            logger.error(f"DocxBuilder Service Error: {e}", exc_info=True)
            raise RuntimeError(f"Failed to build DOCX: {str(e)}")
