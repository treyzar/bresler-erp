# project/app/utils/html_parser.py
from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

from .elements import (
    is_likely_signature,
    make_divider_element,
    make_image_element,
    make_signature_element,
    make_table_element,
    make_text_element,
)


def parse_style(style_str: str) -> dict[str, Any]:
    styles = {}
    if not style_str:
        return styles
    for item in style_str.split(";"):
        if ":" in item:
            key, val = item.split(":", 1)
            styles[key.strip().lower()] = val.strip()
    return styles


def parse_html(file_obj) -> dict[str, Any]:
    content = file_obj.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="ignore")

    soup = BeautifulSoup(content, "html.parser")
    elements: list[dict[str, Any]] = []

    y_offset = 40
    PAGE_WIDTH = 794
    LEFT_MARGIN = 40
    CONTENT_WIDTH = PAGE_WIDTH - (LEFT_MARGIN * 2)
    plain_lines = []

    # Теги для обработки
    target_tags = ["p", "div", "h1", "h2", "h3", "h4", "h5", "li", "img", "table", "hr"]

    for tag in soup.find_all(target_tags):
        # Игнорируем вложенные элементы, чтобы не дублировать
        if tag.find_parent("table") and tag.name != "table":
            continue
        # Пропускаем div-обертки, если в них нет текста напрямую (чтобы не создавать пустых блоков)
        if tag.name == "div" and not tag.get_text(strip=True) and not tag.find("img"):
            continue

        styles = parse_style(tag.get("style", ""))

        # --- TEKST ---
        if tag.name in ["p", "div", "li"] or tag.name.startswith("h"):
            text = tag.get_text(strip=True)
            if not text:
                continue

            # Базовые стили
            font_size = 14
            is_bold = False
            color = styles.get("color", "#000000")
            align = styles.get("text-align", "left")

            # Стили заголовков
            if tag.name.startswith("h"):
                try:
                    level = int(tag.name[1])
                    font_size = 32 - (level * 2)
                    is_bold = True
                except (ValueError, IndexError):
                    pass

            # CSS переопределения
            if "font-size" in styles:
                try:
                    fs = styles["font-size"].lower().replace("px", "").replace("pt", "")
                    font_size = int(float(fs))
                except (ValueError, TypeError):
                    pass

            fw = styles.get("font-weight")
            if fw in ["bold", "700", "800", "900"] or tag.find("b") or tag.find("strong"):
                is_bold = True

            h_el = int(font_size * 1.5)
            # Оценка высоты блока текста
            lines_est = (len(text) * (font_size * 0.6)) / CONTENT_WIDTH
            total_h = int(max(1, lines_est) * h_el) + 10

            elements.append(
                make_text_element(
                    x=LEFT_MARGIN,
                    y=y_offset,
                    width=CONTENT_WIDTH,
                    height=total_h,
                    content=text,
                    size=font_size,
                    bold=is_bold,
                    color=color,
                    align=align,
                )
            )
            plain_lines.append(text)
            y_offset += total_h + 10

        # --- КАРТИНКИ / ПОДПИСИ ---
        elif tag.name == "img":
            src = tag.get("src", "")
            if not src:
                continue

            # Пытаемся взять размеры
            w, h = 200, 150
            try:
                if tag.get("width"):
                    w = int(tag["width"].replace("px", "").replace("%", ""))  # % игнорируем пока
                if tag.get("height"):
                    h = int(tag["height"].replace("px", "").replace("%", ""))
            except (ValueError, TypeError, AttributeError):
                pass

            # Признаки подписи
            alt = tag.get("alt", "").lower()
            cls = " ".join(tag.get("class", [])).lower()
            is_explicit = "signature" in alt or "signature" in cls or "подпись" in alt

            if is_explicit or is_likely_signature(w, h):
                elements.append(make_signature_element(x=LEFT_MARGIN, y=y_offset, width=w, height=h, src=src))
            else:
                elements.append(make_image_element(x=LEFT_MARGIN, y=y_offset, width=w, height=h, src=src))
            y_offset += h + 10

        # --- ТАБЛИЦЫ ---
        elif tag.name == "table":
            rows_data = []
            for tr in tag.find_all("tr"):
                cells = tr.find_all(["td", "th"])
                row_txt = [c.get_text(strip=True) for c in cells]
                if any(row_txt):
                    rows_data.append(row_txt)

            if rows_data:
                rows = len(rows_data)
                len(rows_data[0])
                tbl_h = rows * 30

                elements.append(
                    make_table_element(x=LEFT_MARGIN, y=y_offset, width=CONTENT_WIDTH, height=tbl_h, data=rows_data)
                )
                y_offset += tbl_h + 20

        # --- РАЗДЕЛИТЕЛИ ---
        elif tag.name == "hr":
            elements.append(make_divider_element(x=LEFT_MARGIN, y=y_offset, width=CONTENT_WIDTH))
            y_offset += 20

    return {"elements": elements, "text": "\n".join(plain_lines)}
