#!/usr/bin/env python3
"""Generate Bresler ERP sales presentation as 16:9 PDF deck."""
import io
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

# ── Fonts ────────────────────────────────────────────────────────────
FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Sans", f"{FONT_DIR}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", f"{FONT_DIR}/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Light", f"{FONT_DIR}/DejaVuSans-ExtraLight.ttf"))

plt.rcParams["font.family"] = "DejaVu Sans"

# ── Slide dimensions: 16:9 landscape ────────────────────────────────
SLIDE_W = 33.867 * cm  # 1920px @ 144dpi
SLIDE_H = 19.05 * cm   # 1080px @ 144dpi
PAGESIZE = (SLIDE_W, SLIDE_H)

# ── Color palette (modern, vibrant) ─────────────────────────────────
NAVY = HexColor("#0f172a")
DARK = HexColor("#1e293b")
PRIMARY = HexColor("#2563eb")
PRIMARY_LIGHT = HexColor("#3b82f6")
ACCENT = HexColor("#f59e0b")
SUCCESS = HexColor("#10b981")
DANGER = HexColor("#ef4444")
PURPLE = HexColor("#8b5cf6")
PINK = HexColor("#ec4899")
CYAN = HexColor("#06b6d4")
WHITE = HexColor("#ffffff")
LIGHT_GRAY = HexColor("#f1f5f9")
GRAY = HexColor("#64748b")
LIGHT_BG = HexColor("#f8fafc")

# Module accent colors
MODULE_COLORS = {
    "orders": HexColor("#3b82f6"),
    "purchasing": HexColor("#f59e0b"),
    "specs": HexColor("#8b5cf6"),
    "directory": HexColor("#10b981"),
    "devices": HexColor("#06b6d4"),
    "edo": HexColor("#ec4899"),
}


# ── Drawing helpers ──────────────────────────────────────────────────
def draw_bg(c, color=WHITE):
    c.setFillColor(color)
    c.rect(0, 0, SLIDE_W, SLIDE_H, fill=1, stroke=0)


def draw_gradient_band(c, y, h, color1, color2):
    """Simulate gradient using horizontal stripes."""
    steps = 80
    for i in range(steps):
        t = i / steps
        r = color1.red * (1 - t) + color2.red * t
        g = color1.green * (1 - t) + color2.green * t
        b = color1.blue * (1 - t) + color2.blue * t
        c.setFillColorRGB(r, g, b)
        c.rect(0, y + h * (1 - (i + 1) / steps), SLIDE_W, h / steps + 0.05, fill=1, stroke=0)


def text(c, x, y, txt, font="Sans", size=12, color=NAVY, anchor="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if anchor == "center":
        c.drawCentredString(x, y, txt)
    elif anchor == "right":
        c.drawRightString(x, y, txt)
    else:
        c.drawString(x, y, txt)


def wrapped_text(c, x, y, txt, font="Sans", size=12, color=NAVY,
                 max_width=10 * cm, line_height=1.4):
    """Simple word-wrap text drawer. Returns final y."""
    c.setFont(font, size)
    c.setFillColor(color)
    words = txt.split()
    line = []
    cy = y
    for w in words:
        test = " ".join(line + [w])
        if c.stringWidth(test, font, size) <= max_width:
            line.append(w)
        else:
            c.drawString(x, cy, " ".join(line))
            cy -= size * line_height
            line = [w]
    if line:
        c.drawString(x, cy, " ".join(line))
        cy -= size * line_height
    return cy


def card(c, x, y, w, h, fill=WHITE, stroke=None, radius=0.3 * cm,
         shadow=False):
    if shadow:
        c.setFillColorRGB(0, 0, 0, alpha=0.08)
        c.roundRect(x + 0.1 * cm, y - 0.1 * cm, w, h, radius, fill=1, stroke=0)
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(0.5)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


def page_number(c, num, total):
    c.setFont("Sans", 8)
    c.setFillColor(GRAY)
    c.drawRightString(SLIDE_W - 1 * cm, 0.5 * cm, f"{num} / {total}")
    c.drawString(1 * cm, 0.5 * cm, "Bresler ERP")


def chart_image(fig, w=10 * cm, h=6 * cm):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=200, bbox_inches="tight",
                facecolor="white", edgecolor="none", transparent=False)
    plt.close(fig)
    buf.seek(0)
    return buf


# ── Slide builders ───────────────────────────────────────────────────
TOTAL_PAGES = 18


def slide_cover(c):
    # Dark gradient background
    draw_gradient_band(c, 0, SLIDE_H, NAVY, PRIMARY)

    # Decorative circle accents
    c.setFillColorRGB(1, 1, 1, alpha=0.05)
    c.circle(SLIDE_W - 4 * cm, SLIDE_H - 4 * cm, 6 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1, alpha=0.04)
    c.circle(3 * cm, 3 * cm, 4 * cm, fill=1, stroke=0)

    # Brand mark (small dot accent)
    c.setFillColor(ACCENT)
    c.circle(2.5 * cm, SLIDE_H - 2.5 * cm, 0.25 * cm, fill=1, stroke=0)
    text(c, 3 * cm, SLIDE_H - 2.55 * cm, "BRESLER", "Sans-Bold", 10, WHITE)

    # Big title
    text(c, 2.5 * cm, SLIDE_H - 7 * cm, "Bresler ERP", "Sans-Bold", 60, WHITE)

    # Tagline
    c.setFillColor(ACCENT)
    c.rect(2.5 * cm, SLIDE_H - 7.7 * cm, 1.5 * cm, 0.15 * cm, fill=1, stroke=0)
    text(c, 2.5 * cm, SLIDE_H - 9 * cm,
         "Корпоративная ERP нового поколения",
         "Sans-Light", 22, WHITE)
    text(c, 2.5 * cm, SLIDE_H - 10 * cm,
         "для производства РЗА и АСУ ТП",
         "Sans-Light", 22, WHITE)

    # Bottom info
    text(c, 2.5 * cm, 2 * cm,
         "От заказа до отгрузки. От заявки до оплаты. В одной системе.",
         "Sans", 13, HexColor("#cbd5e1"))
    text(c, SLIDE_W - 2.5 * cm, 2 * cm,
         "v1.0 · 2026", "Sans", 11, HexColor("#94a3b8"), anchor="right")


def slide_problem(c):
    draw_bg(c, LIGHT_BG)

    # Header
    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "ПРОБЛЕМА",
         "Sans-Bold", 11, DANGER)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Унаследованная система перестала справляться",
         "Sans-Bold", 26, NAVY)

    # Old system problems
    problems = [
        ("Django 4.2 + jQuery", "Стек 2018 года, поддерживать всё дороже"),
        ("0% покрытия тестами", "Каждая правка — потенциальный инцидент"),
        ("God-объекты", "Изменения в одном месте ломают другое"),
        ("Нет workflow", "Статусы меняются произвольно, нет контроля"),
        ("Нет уведомлений", "Просрочки и оплаты остаются незамеченными"),
        ("Нет аналитики", "Руководитель не видит картину в реальном времени"),
    ]

    col_w = 9.5 * cm
    row_h = 2.3 * cm
    for i, (title, desc) in enumerate(problems):
        col = i % 3
        row = i // 3
        x = 2.5 * cm + col * (col_w + 0.5 * cm)
        y = SLIDE_H - 7 * cm - row * (row_h + 0.5 * cm)

        card(c, x, y, col_w, row_h, fill=WHITE, shadow=True)
        # Red accent bar
        c.setFillColor(DANGER)
        c.rect(x, y, 0.15 * cm, row_h, fill=1, stroke=0)

        text(c, x + 0.6 * cm, y + row_h - 0.7 * cm, title,
             "Sans-Bold", 13, NAVY)
        wrapped_text(c, x + 0.6 * cm, y + row_h - 1.3 * cm, desc,
                     "Sans", 10, GRAY, max_width=col_w - 1 * cm)

    page_number(c, 2, TOTAL_PAGES)


def slide_solution(c):
    draw_bg(c, WHITE)

    # Side accent bar
    c.setFillColor(PRIMARY)
    c.rect(0, 0, 0.5 * cm, SLIDE_H, fill=1, stroke=0)

    text(c, 2 * cm, SLIDE_H - 2.5 * cm, "РЕШЕНИЕ",
         "Sans-Bold", 11, PRIMARY)
    text(c, 2 * cm, SLIDE_H - 4 * cm,
         "Bresler ERP — построено с нуля",
         "Sans-Bold", 28, NAVY)
    text(c, 2 * cm, SLIDE_H - 5 * cm,
         "Современный стек, тестируемая архитектура,",
         "Sans-Light", 18, GRAY)
    text(c, 2 * cm, SLIDE_H - 5.8 * cm,
         "real-time, реальные процессы — а не их имитация.",
         "Sans-Light", 18, GRAY)

    # Big stats row
    stats = [
        ("12", "модулей", PRIMARY),
        ("43", "API", CYAN),
        ("544", "теста", SUCCESS),
        ("100%", "TS strict", PURPLE),
        ("∞", "масштаб", ACCENT),
    ]
    box_w = 5.5 * cm
    gap = 0.4 * cm
    total_w = len(stats) * box_w + (len(stats) - 1) * gap
    start_x = (SLIDE_W - total_w) / 2

    for i, (val, label, color) in enumerate(stats):
        x = start_x + i * (box_w + gap)
        y = 4 * cm
        card(c, x, y, box_w, 5 * cm, fill=LIGHT_BG, shadow=True)
        text(c, x + box_w / 2, y + 2.7 * cm, val,
             "Sans-Bold", 44, color, anchor="center")
        text(c, x + box_w / 2, y + 1.3 * cm, label,
             "Sans", 13, GRAY, anchor="center")

    page_number(c, 3, TOTAL_PAGES)


def slide_architecture(c):
    draw_bg(c, NAVY)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "АРХИТЕКТУРА",
         "Sans-Bold", 11, ACCENT)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Модульный монолит. 12 независимых модулей",
         "Sans-Bold", 24, WHITE)

    # Module grid
    modules = [
        ("Заказы", "orders", PRIMARY_LIGHT),
        ("Закупки", "purchasing", ACCENT),
        ("Спецификации", "specs", PURPLE),
        ("Справочники", "directory", SUCCESS),
        ("Устройства РЗА", "devices", CYAN),
        ("ЭДО", "edo", PINK),
        ("Уведомления", "notifications", HexColor("#a78bfa")),
        ("Импорт/Экспорт", "importer", HexColor("#f87171")),
        ("Отчёты", "reports", HexColor("#34d399")),
        ("Комментарии", "comments", HexColor("#fbbf24")),
        ("Пользователи", "users", HexColor("#60a5fa")),
        ("Core", "core", HexColor("#94a3b8")),
    ]

    cols = 4
    box_w = 7 * cm
    box_h = 2.4 * cm
    gap = 0.5 * cm
    start_x = (SLIDE_W - (cols * box_w + (cols - 1) * gap)) / 2
    start_y = SLIDE_H - 7 * cm

    for i, (label, code, color) in enumerate(modules):
        col = i % cols
        row = i // cols
        x = start_x + col * (box_w + gap)
        y = start_y - row * (box_h + gap)

        c.setFillColor(HexColor("#1e293b"))
        c.roundRect(x, y, box_w, box_h, 0.3 * cm, fill=1, stroke=0)

        # Color dot
        c.setFillColor(color)
        c.circle(x + 0.8 * cm, y + box_h / 2, 0.3 * cm, fill=1, stroke=0)

        text(c, x + 1.5 * cm, y + box_h / 2 - 0.15 * cm, label,
             "Sans-Bold", 13, WHITE)

    text(c, SLIDE_W / 2, 2.2 * cm,
         "Service layer · Event bus · Workflow engine · WebSocket · Async tasks",
         "Sans", 11, HexColor("#94a3b8"), anchor="center")

    page_number(c, 4, TOTAL_PAGES)


def slide_module(c, page_num, title, subtitle, color, features, hero_value, hero_label):
    draw_bg(c, WHITE)

    # Top color stripe
    c.setFillColor(color)
    c.rect(0, SLIDE_H - 1 * cm, SLIDE_W, 1 * cm, fill=1, stroke=0)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "МОДУЛЬ",
         "Sans-Bold", 11, color)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm, title,
         "Sans-Bold", 32, NAVY)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm, subtitle,
         "Sans-Light", 16, GRAY)

    # Features list (left)
    y = SLIDE_H - 7 * cm
    for feature in features:
        # Bullet
        c.setFillColor(color)
        c.circle(3 * cm, y + 0.15 * cm, 0.12 * cm, fill=1, stroke=0)
        text(c, 3.5 * cm, y, feature, "Sans", 13, NAVY)
        y -= 0.85 * cm

    # Hero number on the right
    hero_x = SLIDE_W - 11 * cm
    hero_y = 4.5 * cm
    card(c, hero_x, hero_y, 9 * cm, 9 * cm, fill=LIGHT_BG, shadow=True)

    text(c, hero_x + 4.5 * cm, hero_y + 5.5 * cm, hero_value,
         "Sans-Bold", 64, color, anchor="center")
    text(c, hero_x + 4.5 * cm, hero_y + 3 * cm, hero_label,
         "Sans", 12, GRAY, anchor="center")

    # Decorative line
    c.setFillColor(color)
    c.rect(hero_x + 3 * cm, hero_y + 2.3 * cm, 3 * cm, 0.1 * cm, fill=1, stroke=0)

    page_number(c, page_num, TOTAL_PAGES)


def slide_orders(c):
    slide_module(c, 5,
        "Заказы и контракты",
        "От нового заказа до отгрузки в одном flow",
        PRIMARY,
        [
            "Workflow с проверкой условий перехода",
            "Контракт с автонумерацией и шаблонами оплаты",
            "Автоматические уведомления менеджерам",
            "WebSocket: видно, кто сейчас открыл заказ",
            "Полная история изменений (audit trail)",
            "Загрузка файлов с категориями",
            "Несколько партий отгрузки в одном заказе",
        ],
        "5", "статусов workflow",
    )


def slide_purchasing(c):
    slide_module(c, 6,
        "Закупки",
        "Полный цикл: склад → заявка → ордер → оплата",
        ACCENT,
        [
            "Складской учёт с резервированием под заказ",
            "Заявки от тех. специалистов с подсказкой «есть на складе»",
            "Реестр закупочных ордеров и поставщиков",
            "Согласование оплат: pending → approved → paid",
            "Карточка поставщика: скидки, условия, история",
            "Напоминания о просроченных оплатах",
            "Дашборд руководителя: KPI и прогнозы",
        ],
        "12", "моделей в модуле",
    )


def slide_bom_calculator(c):
    draw_bg(c, WHITE)

    c.setFillColor(ACCENT)
    c.rect(0, SLIDE_H - 1 * cm, SLIDE_W, 1 * cm, fill=1, stroke=0)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "УНИКАЛЬНАЯ ВОЗМОЖНОСТЬ",
         "Sans-Bold", 11, ACCENT)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "BOM-калькулятор себестоимости",
         "Sans-Bold", 30, NAVY)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm,
         "Не имеет аналогов в open source ERP",
         "Sans-Light", 16, GRAY)

    # Description
    desc = [
        "Себестоимость продукта рассчитывается автоматически",
        "из реальных закупочных цен компонентов",
        "",
        "→ Видим маржу до момента отгрузки",
        "→ Контролируем рост цен поставщиков",
        "→ Принимаем решения на основе данных",
    ]
    y = SLIDE_H - 7 * cm
    for line in desc:
        if line.startswith("→"):
            text(c, 2.5 * cm, y, line, "Sans-Bold", 14, ACCENT)
        else:
            text(c, 2.5 * cm, y, line, "Sans", 13, NAVY)
        y -= 0.7 * cm

    # Mock-up cost breakdown
    mock_x = SLIDE_W - 14 * cm
    mock_y = 2.5 * cm
    card(c, mock_x, mock_y, 12 * cm, 12 * cm, fill=LIGHT_BG, shadow=True)

    text(c, mock_x + 0.8 * cm, mock_y + 11 * cm, "Шкаф НКУ-630А",
         "Sans-Bold", 14, NAVY)
    text(c, mock_x + 0.8 * cm, mock_y + 10.3 * cm, "ID: NK-630-001",
         "Sans", 9, GRAY)

    components = [
        ("Корпус металлический", 1, "12 500"),
        ("Автоматический выключатель", 4, "8 200"),
        ("Контактор", 2, "3 400"),
        ("Реле защиты", 1, "5 600"),
        ("Шинопровод медный", 1, "9 800"),
        ("Кабельная разводка", 1, "4 200"),
    ]
    cy = mock_y + 9 * cm
    text(c, mock_x + 0.8 * cm, cy, "Компонент",
         "Sans-Bold", 9, GRAY)
    text(c, mock_x + 7.5 * cm, cy, "Кол.", "Sans-Bold", 9, GRAY)
    text(c, mock_x + 11 * cm, cy, "Цена", "Sans-Bold", 9, GRAY, anchor="right")
    cy -= 0.4 * cm
    c.setStrokeColor(GRAY)
    c.setLineWidth(0.3)
    c.line(mock_x + 0.8 * cm, cy, mock_x + 11.2 * cm, cy)
    cy -= 0.3 * cm

    for name, qty, price in components:
        text(c, mock_x + 0.8 * cm, cy, name, "Sans", 10, NAVY)
        text(c, mock_x + 7.5 * cm, cy, str(qty), "Sans", 10, NAVY)
        text(c, mock_x + 11 * cm, cy, price, "Sans", 10, NAVY, anchor="right")
        cy -= 0.55 * cm

    # Total bar
    cy -= 0.3 * cm
    c.setFillColor(ACCENT)
    c.roundRect(mock_x + 0.5 * cm, cy - 0.3 * cm, 11 * cm, 1.2 * cm,
                0.2 * cm, fill=1, stroke=0)
    text(c, mock_x + 1 * cm, cy + 0.1 * cm,
         "Себестоимость:", "Sans-Bold", 12, WHITE)
    text(c, mock_x + 11 * cm, cy + 0.1 * cm,
         "78 400 ₽", "Sans-Bold", 14, WHITE, anchor="right")

    page_number(c, 7, TOTAL_PAGES)


def slide_price_comparison(c):
    draw_bg(c, WHITE)

    c.setFillColor(PURPLE)
    c.rect(0, SLIDE_H - 1 * cm, SLIDE_W, 1 * cm, fill=1, stroke=0)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "УНИКАЛЬНАЯ ВОЗМОЖНОСТЬ",
         "Sans-Bold", 11, PURPLE)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Закупочная цена vs цена в КП",
         "Sans-Bold", 30, NAVY)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm,
         "Видим маржу по каждой позиции в реальном времени",
         "Sans-Light", 16, GRAY)

    # Generate margin chart
    products = ["РЗА терминал", "Шкаф 630А", "Реле защиты", "Контактор", "Кабель"]
    purchase = [45000, 12500, 8200, 3400, 1200]
    kp = [68000, 18900, 11500, 4800, 1850]

    fig, ax = plt.subplots(figsize=(8, 4.5))
    x = range(len(products))
    width = 0.35
    bars1 = ax.bar([i - width/2 for i in x], purchase, width,
                   label="Закупка", color="#f59e0b")
    bars2 = ax.bar([i + width/2 for i in x], kp, width,
                   label="КП", color="#8b5cf6")
    ax.set_xticks(x)
    ax.set_xticklabels(products, fontsize=9)
    ax.set_ylabel("Цена (руб.)", fontsize=10)
    ax.set_title("Закупка vs КП по позициям", fontsize=12, fontweight="bold")
    ax.legend(loc="upper right")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_axisbelow(True)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    img = chart_image(fig)
    c.drawImage(matplotlib_image(img), 2.5 * cm, 2 * cm,
                width=18 * cm, height=11 * cm)

    # Right info card
    info_x = 22 * cm
    info_y = 2.5 * cm
    card(c, info_x, info_y, 9.5 * cm, 11 * cm, fill=LIGHT_BG, shadow=True)

    text(c, info_x + 0.8 * cm, info_y + 10 * cm,
         "Что это даёт", "Sans-Bold", 14, NAVY)
    text(c, info_x + 0.8 * cm, info_y + 9.2 * cm,
         "руководству:", "Sans-Bold", 14, NAVY)

    bullets = [
        ("Контроль маржи", "до момента отгрузки"),
        ("Раннее обнаружение", "роста закупочных цен"),
        ("Прогноз выручки", "на основе KP"),
        ("Аргументы", "для торга с поставщиками"),
    ]
    by = info_y + 8 * cm
    for title, sub in bullets:
        c.setFillColor(PURPLE)
        c.circle(info_x + 1 * cm, by + 0.15 * cm, 0.12 * cm, fill=1, stroke=0)
        text(c, info_x + 1.5 * cm, by, title, "Sans-Bold", 11, NAVY)
        text(c, info_x + 1.5 * cm, by - 0.4 * cm, sub, "Sans", 9, GRAY)
        by -= 1.4 * cm

    page_number(c, 8, TOTAL_PAGES)


def matplotlib_image(buf):
    """Wrap a BytesIO matplotlib buffer for canvas.drawImage."""
    from reportlab.lib.utils import ImageReader
    return ImageReader(buf)


def slide_dashboards(c):
    draw_bg(c, LIGHT_BG)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "АНАЛИТИКА",
         "Sans-Bold", 11, SUCCESS)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Дашборды для всех ролей",
         "Sans-Bold", 28, NAVY)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm,
         "Каждый сотрудник видит то, что ему нужно — без отчётов в Excel",
         "Sans-Light", 14, GRAY)

    dashboards = [
        ("Главная", "Общие KPI компании", PRIMARY,
         ["Активные заказы", "Просроченные", "Выручка месяца"]),
        ("Менеджер", "Личный кабинет", SUCCESS,
         ["Мои заказы", "Конверсия КП", "Топ заказчиков"]),
        ("Руководитель", "Команда и подчинённые", PURPLE,
         ["Метрики команды", "Сводка по сотрудникам", "Загрузка"]),
        ("Закупки", "ЛК руководителя закупок", ACCENT,
         ["Топ поставщиков", "Прогноз закупок", "На согласовании"]),
    ]

    box_w = 7 * cm
    box_h = 9 * cm
    gap = 0.5 * cm
    start_x = (SLIDE_W - (4 * box_w + 3 * gap)) / 2
    by = 2.5 * cm

    for i, (title, sub, color, items) in enumerate(dashboards):
        x = start_x + i * (box_w + gap)
        card(c, x, by, box_w, box_h, fill=WHITE, shadow=True)

        # Header bar
        c.setFillColor(color)
        c.rect(x, by + box_h - 1.2 * cm, box_w, 1.2 * cm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.roundRect(x, by, box_w, box_h, 0.3 * cm, fill=0, stroke=0)

        text(c, x + box_w / 2, by + box_h - 0.8 * cm, title,
             "Sans-Bold", 14, WHITE, anchor="center")

        text(c, x + box_w / 2, by + box_h - 2 * cm, sub,
             "Sans", 10, GRAY, anchor="center")

        # Items
        iy = by + box_h - 3 * cm
        for item in items:
            c.setFillColor(color)
            c.circle(x + 0.6 * cm, iy + 0.12 * cm, 0.08 * cm, fill=1, stroke=0)
            text(c, x + 1 * cm, iy, item, "Sans", 10, NAVY)
            iy -= 0.6 * cm

        # Bottom mock chart
        mock_y = by + 1 * cm
        for j in range(4):
            bh = 0.3 * cm + (j * 0.15 * cm)
            c.setFillColor(color)
            c.setFillColorRGB(color.red, color.green, color.blue, alpha=0.3 + j * 0.15)
            c.rect(x + 0.6 * cm + j * 1.5 * cm, mock_y, 1 * cm, bh, fill=1, stroke=0)

    page_number(c, 9, TOTAL_PAGES)


def slide_workflow(c):
    draw_bg(c, NAVY)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "БИЗНЕС-ЛОГИКА",
         "Sans-Bold", 11, ACCENT)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Workflow Engine + Event Bus",
         "Sans-Bold", 28, WHITE)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm,
         "Бизнес-правила в коде. Невозможно сломать процесс — система не даст",
         "Sans-Light", 14, HexColor("#cbd5e1"))

    # Workflow visualization: order states
    states = [
        ("Новый", PRIMARY, "N"),
        ("Договор", CYAN, "D"),
        ("Производство", ACCENT, "P"),
        ("Собран", PURPLE, "C"),
        ("Отгружен", SUCCESS, "S"),
    ]
    box_w = 5 * cm
    gap = 1.2 * cm
    total_w = 5 * box_w + 4 * gap
    sx = (SLIDE_W - total_w) / 2
    sy = SLIDE_H - 10 * cm

    for i, (name, color, code) in enumerate(states):
        x = sx + i * (box_w + gap)
        # Box
        c.setFillColor(color)
        c.roundRect(x, sy, box_w, 2.5 * cm, 0.3 * cm, fill=1, stroke=0)
        text(c, x + box_w / 2, sy + 1.5 * cm, name,
             "Sans-Bold", 14, WHITE, anchor="center")
        text(c, x + box_w / 2, sy + 0.7 * cm, f"({code})",
             "Sans", 10, WHITE, anchor="center")

        # Arrow
        if i < len(states) - 1:
            ax = x + box_w + 0.2 * cm
            ay = sy + 1.25 * cm
            c.setStrokeColor(WHITE)
            c.setLineWidth(2)
            c.line(ax, ay, ax + gap - 0.4 * cm, ay)
            # Arrowhead
            c.setFillColor(WHITE)
            p = c.beginPath()
            p.moveTo(ax + gap - 0.2 * cm, ay)
            p.lineTo(ax + gap - 0.5 * cm, ay + 0.15 * cm)
            p.lineTo(ax + gap - 0.5 * cm, ay - 0.15 * cm)
            p.close()
            c.drawPath(p, fill=1, stroke=0)

    # Conditions row
    text(c, SLIDE_W / 2, sy - 1.2 * cm,
         "С автоматической проверкой условий перехода:",
         "Sans-Bold", 12, ACCENT, anchor="center")
    conditions = [
        "✓ Контракт существует?",
        "✓ Аванс получен?",
        "✓ Дата отгрузки заполнена?",
        "✓ Пользователь имеет права?",
    ]
    text(c, SLIDE_W / 2, sy - 2.2 * cm,
         "  ·  ".join(conditions),
         "Sans", 11, WHITE, anchor="center")

    # Event bus visualization at bottom
    c.setFillColor(HexColor("#1e293b"))
    c.roundRect(2.5 * cm, 1.5 * cm, SLIDE_W - 5 * cm, 1.8 * cm,
                0.3 * cm, fill=1, stroke=0)
    text(c, SLIDE_W / 2, 2.7 * cm,
         "Event Bus",
         "Sans-Bold", 12, ACCENT, anchor="center")
    text(c, SLIDE_W / 2, 2 * cm,
         "order.created → notify · contract.paid → notify · payment.due → reminder",
         "Sans", 10, HexColor("#94a3b8"), anchor="center")

    page_number(c, 10, TOTAL_PAGES)


def slide_tech_stack(c):
    draw_bg(c, WHITE)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "ТЕХНОЛОГИИ",
         "Sans-Bold", 11, PRIMARY)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Современный стек, проверенный временем",
         "Sans-Bold", 26, NAVY)

    categories = [
        ("Backend", PRIMARY, [
            ("Python", "3.12"),
            ("Django", "5.2 LTS"),
            ("DRF", "3.15"),
            ("Celery", "5.4"),
            ("Channels", "4.2"),
        ]),
        ("Frontend", CYAN, [
            ("React", "19"),
            ("TypeScript", "5.9 strict"),
            ("Vite", "7"),
            ("TanStack Query", "5.9"),
            ("Tailwind", "4"),
        ]),
        ("Инфраструктура", SUCCESS, [
            ("PostgreSQL", "16"),
            ("Redis", "7"),
            ("Docker", "—"),
            ("Nginx", "1.27"),
            ("Sentry", "—"),
        ]),
        ("Безопасность", PURPLE, [
            ("JWT", "SimpleJWT"),
            ("LDAP/AD", "django-auth-ldap"),
            ("Audit trail", "simple-history"),
            ("CORS", "—"),
            ("SSL/TLS", "1.3"),
        ]),
    ]

    box_w = 7 * cm
    box_h = 11 * cm
    gap = 0.5 * cm
    sx = (SLIDE_W - (4 * box_w + 3 * gap)) / 2
    sy = 2 * cm

    for i, (title, color, items) in enumerate(categories):
        x = sx + i * (box_w + gap)
        card(c, x, sy, box_w, box_h, fill=LIGHT_BG, shadow=True)

        # Color header
        c.setFillColor(color)
        c.roundRect(x, sy + box_h - 1.2 * cm, box_w, 1.2 * cm, 0.3 * cm,
                    fill=1, stroke=0)
        c.rect(x, sy + box_h - 1.2 * cm, box_w, 0.5 * cm, fill=1, stroke=0)

        text(c, x + box_w / 2, sy + box_h - 0.8 * cm, title,
             "Sans-Bold", 13, WHITE, anchor="center")

        iy = sy + box_h - 2.3 * cm
        for name, ver in items:
            text(c, x + 0.6 * cm, iy, name, "Sans-Bold", 11, NAVY)
            text(c, x + box_w - 0.6 * cm, iy, ver,
                 "Sans", 10, GRAY, anchor="right")
            iy -= 1.6 * cm

    page_number(c, 11, TOTAL_PAGES)


def slide_metrics(c):
    draw_bg(c, NAVY)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "ЦИФРЫ ПРОЕКТА",
         "Sans-Bold", 11, ACCENT)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Что под капотом",
         "Sans-Bold", 28, WHITE)

    big_metrics = [
        ("58 000+", "строк кода", PRIMARY),
        ("544", "backend тестов", SUCCESS),
        ("12", "модулей", ACCENT),
        ("63", "модели данных", PURPLE),
        ("43", "REST endpoint", CYAN),
        ("100%", "TypeScript strict", PINK),
    ]

    cols = 3
    box_w = 9 * cm
    box_h = 5 * cm
    gap = 0.5 * cm
    sx = (SLIDE_W - (cols * box_w + (cols - 1) * gap)) / 2
    sy = SLIDE_H - 12 * cm

    for i, (val, label, color) in enumerate(big_metrics):
        col = i % cols
        row = i // cols
        x = sx + col * (box_w + gap)
        y = sy - row * (box_h + gap)

        c.setFillColor(HexColor("#1e293b"))
        c.roundRect(x, y, box_w, box_h, 0.4 * cm, fill=1, stroke=0)

        # Color bar at top
        c.setFillColor(color)
        c.roundRect(x, y + box_h - 0.5 * cm, box_w, 0.5 * cm, 0.4 * cm, fill=1, stroke=0)
        c.rect(x, y + box_h - 0.5 * cm, box_w, 0.25 * cm, fill=1, stroke=0)

        text(c, x + box_w / 2, y + box_h / 2, val,
             "Sans-Bold", 48, color, anchor="center")
        text(c, x + box_w / 2, y + 0.8 * cm, label,
             "Sans", 12, HexColor("#94a3b8"), anchor="center")

    page_number(c, 12, TOTAL_PAGES)


def slide_comparison(c):
    draw_bg(c, WHITE)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "СРАВНЕНИЕ",
         "Sans-Bold", 11, PRIMARY)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Старая система vs Bresler ERP",
         "Sans-Bold", 28, NAVY)

    rows = [
        ("Технологический стек", "Django 4.2 + jQuery (2018)", "Django 5.2 + React 19 (2026)"),
        ("Покрытие тестами", "0%", "544 теста, ≥80% backend"),
        ("Workflow заказов", "Произвольная смена статусов", "Конечный автомат + права"),
        ("Уведомления", "Нет", "In-app + email + WebSocket"),
        ("Аналитика", "Excel-выгрузки", "Real-time дашборды"),
        ("Закупки", "Отдельные таблицы Excel", "Полный модуль с BOM-калькулятором"),
        ("Себестоимость", "Считается вручную", "Автоматически из BOM + закупок"),
        ("Поддерживаемость", "God-объекты", "Service layer + event bus"),
    ]

    table_x = 2.5 * cm
    table_y = SLIDE_H - 6 * cm
    col_widths = [9 * cm, 9.5 * cm, 10 * cm]

    # Header
    headers = ["Параметр", "Старая система", "Bresler ERP"]
    header_colors = [PRIMARY, DANGER, SUCCESS]
    for i, h in enumerate(headers):
        x = table_x + sum(col_widths[:i])
        c.setFillColor(header_colors[i])
        c.rect(x, table_y - 0.8 * cm, col_widths[i], 0.8 * cm, fill=1, stroke=0)
        text(c, x + col_widths[i] / 2, table_y - 0.55 * cm, h,
             "Sans-Bold", 11, WHITE, anchor="center")

    row_h = 1.1 * cm
    for r, row in enumerate(rows):
        for i, cell in enumerate(row):
            x = table_x + sum(col_widths[:i])
            y = table_y - 0.8 * cm - (r + 1) * row_h
            bg = WHITE if r % 2 == 0 else LIGHT_BG
            c.setFillColor(bg)
            c.rect(x, y, col_widths[i], row_h, fill=1, stroke=0)
            tcolor = NAVY if i == 0 else (DANGER if i == 1 else SUCCESS)
            font_name = "Sans-Bold" if i == 0 else "Sans"
            text(c, x + 0.5 * cm, y + 0.4 * cm, cell, font_name, 10, tcolor)

    # Border
    c.setStrokeColor(HexColor("#cbd5e1"))
    c.setLineWidth(0.5)
    c.rect(table_x, table_y - 0.8 * cm - len(rows) * row_h,
           sum(col_widths), 0.8 * cm + len(rows) * row_h, fill=0, stroke=1)

    page_number(c, 13, TOTAL_PAGES)


def slide_roi(c):
    draw_bg(c, LIGHT_BG)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "БИЗНЕС-ЭФФЕКТ",
         "Sans-Bold", 11, SUCCESS)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Что вы получаете",
         "Sans-Bold", 30, NAVY)

    benefits = [
        ("⚡", "Скорость", "На 60% быстрее оформление заказов",
         "Автонумерация, шаблоны, валидация на лету", PRIMARY),
        ("👁", "Прозрачность", "100% видимость процессов",
         "Real-time дашборды, история изменений", CYAN),
        ("💰", "Контроль маржи", "Себестоимость до отгрузки",
         "BOM-калькулятор + сравнение цен", ACCENT),
        ("🛡", "Защита от ошибок", "Workflow не даёт сломать процесс",
         "Проверка условий, права, audit trail", SUCCESS),
        ("📊", "Решения на данных", "Аналитика без Excel",
         "Прогнозы, топы, конверсии — встроенные", PURPLE),
        ("🔌", "Готов к интеграциям", "API-first архитектура",
         "1С, LDAP, webhooks, экспорт в любой формат", PINK),
    ]

    box_w = 10 * cm
    box_h = 5 * cm
    gap = 0.5 * cm
    sx = (SLIDE_W - (3 * box_w + 2 * gap)) / 2
    sy = SLIDE_H - 11.5 * cm

    for i, (icon, title, headline, desc, color) in enumerate(benefits):
        col = i % 3
        row = i // 3
        x = sx + col * (box_w + gap)
        y = sy - row * (box_h + gap)

        card(c, x, y, box_w, box_h, fill=WHITE, shadow=True)

        # Color side bar
        c.setFillColor(color)
        c.rect(x, y, 0.2 * cm, box_h, fill=1, stroke=0)

        # Big colored circle for "icon"
        c.setFillColor(color)
        c.circle(x + 1.5 * cm, y + box_h - 1.2 * cm, 0.6 * cm, fill=1, stroke=0)

        text(c, x + 2.7 * cm, y + box_h - 1 * cm, title,
             "Sans-Bold", 14, NAVY)
        text(c, x + 2.7 * cm, y + box_h - 1.7 * cm, headline,
             "Sans-Bold", 11, color)
        wrapped_text(c, x + 0.6 * cm, y + box_h - 3.2 * cm, desc,
                     "Sans", 10, GRAY, max_width=box_w - 1.2 * cm)

    page_number(c, 14, TOTAL_PAGES)


def slide_workflow_in_action(c):
    draw_bg(c, WHITE)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "СЦЕНАРИЙ ИСПОЛЬЗОВАНИЯ",
         "Sans-Bold", 11, PRIMARY)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "От заявки до отгрузки за 7 шагов",
         "Sans-Bold", 28, NAVY)

    steps = [
        ("1", "Менеджер создаёт заказ", "Автонумерация, привязка к заказчику"),
        ("2", "Формирует ТКП с расчётом", "Спецификация из каталога, выбор условий"),
        ("3", "Подписывается контракт", "Шаблон оплаты автоматически заполняет %"),
        ("4", "Тех. спец создаёт заявку на закупку", "Подсказка «есть на складе»"),
        ("5", "Закупщик оформляет ордер", "Автоподстановка из условий поставщика"),
        ("6", "Согласование и оплата счетов", "Workflow approve → paid"),
        ("7", "Отгрузка по партиям", "Каждая позиция → своя партия"),
    ]

    sy = SLIDE_H - 6 * cm
    box_w = SLIDE_W - 5 * cm
    box_h = 1.4 * cm

    for i, (num, title, desc) in enumerate(steps):
        y = sy - i * (box_h + 0.15 * cm)

        # Number circle
        c.setFillColor(PRIMARY)
        c.circle(3.5 * cm, y + box_h / 2, 0.6 * cm, fill=1, stroke=0)
        text(c, 3.5 * cm, y + box_h / 2 - 0.2 * cm, num,
             "Sans-Bold", 18, WHITE, anchor="center")

        # Title and description
        text(c, 5 * cm, y + box_h - 0.5 * cm, title,
             "Sans-Bold", 13, NAVY)
        text(c, 5 * cm, y + 0.2 * cm, desc,
             "Sans", 10, GRAY)

        # Connecting line
        if i < len(steps) - 1:
            c.setStrokeColor(HexColor("#cbd5e1"))
            c.setLineWidth(2)
            c.setDash([2, 2])
            c.line(3.5 * cm, y - 0.05 * cm, 3.5 * cm, y - 0.15 * cm)
            c.setDash()

    page_number(c, 15, TOTAL_PAGES)


def slide_roadmap(c):
    draw_bg(c, NAVY)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "БУДУЩЕЕ",
         "Sans-Bold", 11, ACCENT)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Roadmap развития",
         "Sans-Bold", 28, WHITE)

    quarters = [
        ("Q2 2026", "СЕЙЧАС", "Production deploy",
         ["Деплой первым пользователям", "Сбор feedback", "Полировка UX"], SUCCESS),
        ("Q3 2026", "СЛЕД.", "Интеграции",
         ["Интеграция с 1С", "Webhooks для внешних систем", "API для мобильного клиента"], PRIMARY),
        ("Q4 2026", "ПЛАН", "Аналитика",
         ["AI-прогнозы спроса", "Автоматические отчёты", "BI-дашборды"], PURPLE),
        ("Q1 2027", "ВИЗИЯ", "Масштабирование",
         ["Multi-tenant архитектура", "Мобильное приложение", "API marketplace"], ACCENT),
    ]

    box_w = 7.5 * cm
    box_h = 11 * cm
    gap = 0.5 * cm
    sx = (SLIDE_W - (4 * box_w + 3 * gap)) / 2
    sy = 2.5 * cm

    for i, (q, badge, title, items, color) in enumerate(quarters):
        x = sx + i * (box_w + gap)

        c.setFillColor(HexColor("#1e293b"))
        c.roundRect(x, sy, box_w, box_h, 0.3 * cm, fill=1, stroke=0)

        # Top color band
        c.setFillColor(color)
        c.roundRect(x, sy + box_h - 1.5 * cm, box_w, 1.5 * cm, 0.3 * cm,
                    fill=1, stroke=0)
        c.rect(x, sy + box_h - 1.5 * cm, box_w, 0.7 * cm, fill=1, stroke=0)

        text(c, x + box_w / 2, sy + box_h - 1 * cm, q,
             "Sans-Bold", 14, WHITE, anchor="center")

        # Badge
        c.setFillColorRGB(1, 1, 1, alpha=0.2)
        c.roundRect(x + 1.5 * cm, sy + box_h - 2.4 * cm, box_w - 3 * cm,
                    0.6 * cm, 0.15 * cm, fill=1, stroke=0)
        text(c, x + box_w / 2, sy + box_h - 2.2 * cm, badge,
             "Sans-Bold", 9, WHITE, anchor="center")

        # Title
        text(c, x + box_w / 2, sy + box_h - 3.5 * cm, title,
             "Sans-Bold", 13, color, anchor="center")

        # Items
        iy = sy + box_h - 4.5 * cm
        for item in items:
            wrapped_text(c, x + 0.6 * cm, iy, "• " + item,
                         "Sans", 10, HexColor("#cbd5e1"),
                         max_width=box_w - 1.2 * cm)
            iy -= 1.5 * cm

    page_number(c, 16, TOTAL_PAGES)


def slide_team(c):
    draw_bg(c, WHITE)

    text(c, 2.5 * cm, SLIDE_H - 2.5 * cm, "КОМАНДА",
         "Sans-Bold", 11, PRIMARY)
    text(c, 2.5 * cm, SLIDE_H - 4 * cm,
         "Кто стоит за продуктом",
         "Sans-Bold", 28, NAVY)
    text(c, 2.5 * cm, SLIDE_H - 5 * cm,
         "Команда инженеров с опытом построения корпоративных систем",
         "Sans-Light", 14, GRAY)

    members = [
        ("Lead Developer", "Архитектура, backend, deployment", PRIMARY),
        ("Frontend Developer", "React, TypeScript, UX", CYAN),
        ("Domain Expert", "Бизнес-процессы РЗА, требования", PURPLE),
        ("QA / DevOps", "Тесты, CI/CD, мониторинг", ACCENT),
    ]

    box_w = 7.5 * cm
    box_h = 8 * cm
    gap = 0.5 * cm
    sx = (SLIDE_W - (4 * box_w + 3 * gap)) / 2
    sy = 4 * cm

    for i, (role, desc, color) in enumerate(members):
        x = sx + i * (box_w + gap)
        card(c, x, sy, box_w, box_h, fill=LIGHT_BG, shadow=True)

        # Avatar circle
        c.setFillColor(color)
        c.circle(x + box_w / 2, sy + box_h - 2.5 * cm, 1.5 * cm, fill=1, stroke=0)

        # Role
        text(c, x + box_w / 2, sy + 3 * cm, role,
             "Sans-Bold", 14, NAVY, anchor="center")
        wrapped_text(c, x + 0.5 * cm, sy + 1.7 * cm, desc,
                     "Sans", 10, GRAY, max_width=box_w - 1 * cm)

    page_number(c, 17, TOTAL_PAGES)


def slide_cta(c):
    draw_gradient_band(c, 0, SLIDE_H, NAVY, PRIMARY)

    # Decorative shapes
    c.setFillColorRGB(1, 1, 1, alpha=0.05)
    c.circle(SLIDE_W - 5 * cm, 5 * cm, 8 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1, alpha=0.04)
    c.circle(5 * cm, SLIDE_H - 5 * cm, 6 * cm, fill=1, stroke=0)

    # Brand
    c.setFillColor(ACCENT)
    c.circle(2.5 * cm, SLIDE_H - 2.5 * cm, 0.25 * cm, fill=1, stroke=0)
    text(c, 3 * cm, SLIDE_H - 2.55 * cm, "BRESLER", "Sans-Bold", 10, WHITE)

    # Big headline
    text(c, SLIDE_W / 2, SLIDE_H - 7 * cm,
         "Готовы начать?",
         "Sans-Bold", 52, WHITE, anchor="center")

    text(c, SLIDE_W / 2, SLIDE_H - 8.5 * cm,
         "Bresler ERP — современная замена legacy систем",
         "Sans-Light", 18, HexColor("#cbd5e1"), anchor="center")

    # Accent line
    c.setFillColor(ACCENT)
    c.rect(SLIDE_W / 2 - 2 * cm, SLIDE_H - 9.5 * cm, 4 * cm, 0.15 * cm,
           fill=1, stroke=0)

    # CTA buttons (visual)
    btn1_x = SLIDE_W / 2 - 8 * cm
    btn2_x = SLIDE_W / 2 + 1 * cm
    btn_y = SLIDE_H - 13 * cm
    btn_w = 7 * cm
    btn_h = 1.8 * cm

    c.setFillColor(ACCENT)
    c.roundRect(btn1_x, btn_y, btn_w, btn_h, 0.3 * cm, fill=1, stroke=0)
    text(c, btn1_x + btn_w / 2, btn_y + 0.6 * cm,
         "Запросить демонстрацию",
         "Sans-Bold", 14, NAVY, anchor="center")

    c.setStrokeColor(WHITE)
    c.setLineWidth(1.5)
    c.roundRect(btn2_x, btn_y, btn_w, btn_h, 0.3 * cm, fill=0, stroke=1)
    text(c, btn2_x + btn_w / 2, btn_y + 0.6 * cm,
         "Получить ТЗ → КП",
         "Sans-Bold", 14, WHITE, anchor="center")

    # Contact info
    text(c, SLIDE_W / 2, 3.5 * cm,
         "bresler-erp.example  ·  hello@bresler.example  ·  +7 (XXX) XXX-XX-XX",
         "Sans", 12, HexColor("#94a3b8"), anchor="center")

    text(c, SLIDE_W / 2, 1.5 * cm,
         "Спасибо за внимание",
         "Sans-Light", 14, HexColor("#cbd5e1"), anchor="center")


# ── Build ────────────────────────────────────────────────────────────
def build_presentation(output_path):
    c = canvas.Canvas(output_path, pagesize=PAGESIZE)
    c.setTitle("Bresler ERP — Презентация продукта")
    c.setAuthor("Bresler")

    slides = [
        slide_cover,
        slide_problem,
        slide_solution,
        slide_architecture,
        slide_orders,
        slide_purchasing,
        slide_bom_calculator,
        slide_price_comparison,
        slide_dashboards,
        slide_workflow,
        slide_tech_stack,
        slide_metrics,
        slide_comparison,
        slide_roi,
        slide_workflow_in_action,
        slide_roadmap,
        slide_team,
        slide_cta,
    ]
    for slide in slides:
        slide(c)
        c.showPage()

    c.save()
    print(f"Presentation generated: {output_path}")


if __name__ == "__main__":
    output = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "BRESLER_ERP_PRESENTATION.pdf",
    )
    build_presentation(output)
