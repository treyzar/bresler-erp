---
marp: true
theme: default
paginate: true
size: 16:9
html: true
backgroundColor: '#1A1A1F'
color: '#A8A8B0'
header: ''
footer: 'Bresler ERP · ЭДО · 2026'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  /* ============== БАЗОВАЯ ТИПОГРАФИКА ============== */
  section {
    font-family: 'Inter', -apple-system, "SF Pro Display", sans-serif;
    padding: 56px 72px;
    font-size: 22px;
    line-height: 1.6;
    background: #1A1A1F;          /* graphite, soft on eyes */
    color: #A8A8B0;
    position: relative;
  }
  section::after {
    color: #5C5C66;
    font-size: 13px;
    font-weight: 500;
  }
  header, footer {
    color: #5C5C66;
    font-size: 12px;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  /* ============== ЗАГОЛОВКИ ============== */
  h1 {
    font-size: 56px;
    font-weight: 700;
    letter-spacing: -0.04em;
    color: #F4F4F6;
    margin: 0 0 0.2em;
    line-height: 1.1;
  }
  h2 {
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: #F4F4F6;
    margin: 0 0 0.7em;
    padding-bottom: 18px;
    line-height: 1.2;
    border-bottom: 1px solid #2E2E36;
    position: relative;
  }
  /* orange accent under h2 */
  h2::after {
    content: "";
    position: absolute;
    left: 0; bottom: -1px;
    width: 64px; height: 2px;
    background: #E73F0C;
  }
  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #DEDEE2;
    letter-spacing: -0.01em;
    margin-top: 0.2em;
  }

  /* ============== ТЕКСТ ============== */
  strong { color: #F4F4F6; font-weight: 600; }
  em { color: #7C7C84; font-style: normal; }
  code {
    background: #24242C;
    color: #DEDEE2;
    padding: 4px 8px;
    border: 1px solid #36363F;
    border-radius: 6px;
    font-size: 0.85em;
    font-family: "JetBrains Mono", "SF Mono", monospace;
  }
  pre {
    background: #14141A;
    border: 1px solid #2E2E36;
    border-radius: 8px;
    padding: 20px 24px;
    font-size: 16px;
    line-height: 1.6;
    color: #B8B8C0;
  }
  ul, ol { padding-left: 1.2em; }
  li { margin: 0.4em 0; }
  blockquote {
    border-left: 2px solid #E73F0C;
    padding: 8px 24px;
    margin: 1.5em 0;
    color: #DEDEE2;
    font-size: 20px;
    background: rgba(231, 63, 12, 0.04);
  }

  /* ============== ТАБЛИЦЫ — card-style ============== */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 6px;
    font-size: 18px;
    margin: 0.8em 0;
  }
  th {
    color: #7C7C84;
    padding: 12px 20px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: none;
  }
  td {
    padding: 14px 20px;
    background: #232329;
    border-top: 1px solid #2E2E36;
    border-bottom: 1px solid #2E2E36;
    color: #DEDEE2;
  }
  td:first-child {
    border-left: 1px solid #2E2E36;
    border-radius: 8px 0 0 8px;
    color: #F4F4F6;
    font-weight: 500;
  }
  td:last-child {
    border-right: 1px solid #2E2E36;
    border-radius: 0 8px 8px 0;
    color: #F4F4F6;
    font-weight: 500;
  }

  /* ============== TITLE / SECTION SLIDES ============== */
  section.title {
    background: #1A1A1F;
    background-image:
      radial-gradient(circle at 80% 20%, rgba(231, 63, 12, 0.10) 0%, transparent 40%),
      radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
    padding: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title h1 {
    font-size: 72px;
    color: #F4F4F6;
    margin-bottom: 24px;
  }
  section.title .tagline {
    font-size: 24px;
    color: #B8B8C0;
    font-weight: 400;
    max-width: 800px;
    line-height: 1.5;
  }
  section.title .meta {
    margin-top: 80px;
    color: #E73F0C;
    font-size: 14px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
  }

  section.section {
    background: #14141A;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.section .num {
    color: #E73F0C;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.15em;
    margin-bottom: 20px;
  }
  section.section h1 {
    font-size: 64px;
  }
  section.section .lead {
    color: #B8B8C0;
    font-size: 22px;
    max-width: 800px;
    margin-top: 24px;
    line-height: 1.5;
  }

  /* ============== STATS ============== */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-top: 32px;
  }
  .stat-card {
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 10px;
    padding: 28px 22px;
    text-align: left;
  }
  .stat-num {
    display: block;
    font-size: 48px;
    font-weight: 700;
    color: #F4F4F6;
    line-height: 1;
    margin-bottom: 12px;
    letter-spacing: -0.04em;
  }
  .stat-card.accent .stat-num { color: #E73F0C; }
  .stat-label {
    font-size: 14px;
    color: #7C7C84;
    line-height: 1.4;
    font-weight: 500;
  }

  /* ============== CARDS ============== */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    margin-top: 16px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin-top: 16px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 12px;
  }
  .card {
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 12px;
    padding: 22px 24px;
  }
  .card.accent {
    border-color: #E73F0C;
    background: linear-gradient(180deg, rgba(231, 63, 12, 0.06) 0%, #232329 100%);
  }
  .card .icon {
    font-size: 24px;
    margin-bottom: 14px;
    opacity: 0.9;
  }
  .card p, .card ul {
    color: #B8B8C0;
    font-size: 16px;
    margin: 0;
  }
  .card ul li { margin: 0.4em 0; }

  /* ============== COMPARISON CARDS (вместо таблицы) ============== */
  .compare {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
    gap: 0;
    margin-top: 8px;
  }
  .compare-head {
    padding: 10px 16px;
    color: #7C7C84;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .compare-head.brand { color: #E73F0C; }
  .compare-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
    gap: 0;
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 10px;
    margin-bottom: 6px;
    overflow: hidden;
  }
  .compare-row.highlight {
    border-color: #E73F0C;
    background: linear-gradient(90deg, #232329 0%, rgba(231, 63, 12, 0.05) 100%);
  }
  .compare-cell {
    padding: 12px 16px;
    font-size: 15px;
    color: #DEDEE2;
    border-right: 1px solid #2E2E36;
    display: flex;
    align-items: center;
  }
  .compare-cell:first-child {
    color: #F4F4F6;
    font-weight: 500;
    background: rgba(255,255,255,0.02);
  }
  .compare-cell:last-child {
    border-right: none;
    color: #F4F4F6;
    font-weight: 600;
    background: rgba(231, 63, 12, 0.05);
  }
  .compare-cell .y { color: #6EE7B7; margin-right: 6px; }
  .compare-cell .n { color: #FCA5A5; margin-right: 6px; }
  .compare-cell .muted { color: #7C7C84; font-size: 13px; }

  /* ============== PILLS / BADGES ============== */
  .pill {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-right: 8px;
    margin-top: 16px;
    background: #24242C;
    color: #DEDEE2;
    border: 1px solid #36363F;
  }
  .pill-accent {
    color: #FFFFFF;
    background: rgba(231, 63, 12, 0.15);
    border-color: #E73F0C;
  }

  /* ============== SVG ============== */
  /* Ограничиваем максимальный размер SVG — иначе они растягиваются по
     intrinsic dimensions из viewBox и выходят за слайд. */
  svg {
    display: block;
    margin: 8px auto;
    max-width: 100%;
    width: 100%;
    height: auto;
    max-height: 380px;
  }

  /* ============== UTILS ============== */
  .center { text-align: center; }
  .muted { color: #5C5C66; }
  .small { font-size: 16px; }

  /* ============== COMPACT-режим для плотных слайдов ============== */
  section.compact { padding: 40px 60px; font-size: 18px; }
  section.compact h2 { font-size: 28px; margin-bottom: 0.3em; padding-bottom: 12px; }
  section.compact .grid-3 { gap: 12px; margin-top: 8px; }
  section.compact .card { padding: 14px 18px; }
  section.compact .card .icon { font-size: 24px; margin-bottom: 6px; }
  section.compact .card h3 { font-size: 16px; margin: 0 0 6px; }
  section.compact .card p, section.compact .card ul { font-size: 13px; line-height: 1.4; }
  section.compact .card ul { margin: 4px 0; padding-left: 1.1em; }
  section.compact .card ul li { margin: 2px 0; }
  section.compact .pill { font-size: 10px; padding: 2px 8px; margin-top: 6px; }
  /* SVG в compact-режиме ещё меньше */
  section.compact svg { max-height: 320px; }
---

# Bresler ЭДО

<div class="tagline">

Внутренний электронный документооборот предприятия —
**типизированные формы, прозрачные цепочки, аудит каждого шага.**

</div>

<div class="meta">

Презентация модуля · Апрель 2026

</div>

---

## Проблема, которую решаем

<div class="grid-2">

<div class="card">

<div class="icon">📁</div>

<h3>Было</h3>

- Word/Excel-шаблоны на сетевых дисках
- Согласование по почте — копии писем теряются
- «У кого сейчас документ?» — никто не знает
- Архив = папка с файлами разных версий
- Просрочки видны постфактум

</div>

<div class="card" style="border-color: #3F3F46; background: #111113;">

<div class="icon">⚡</div>

<h3>Стало</h3>

- Типизированные формы под каждый случай
- Цепочка согласования с автонапоминаниями
- Прозрачная история «кто, когда, что решил»
- PDF-копия с подписями в архиве
- SLA-эскалация → руководителю не приходится спрашивать

</div>

</div>

---

## Архитектура решения

<svg viewBox="0 0 1100 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <rect x="40" y="40" width="280" height="180" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="180" y="80" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">FRONTEND</text>
  <text x="180" y="120" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">React 19 + TypeScript</text>
  <text x="180" y="155" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">TanStack Query · Tailwind</text>
  <text x="180" y="180" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">shadcn/ui · React Hook Form</text>
  <text x="180" y="205" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Canvas signature</text>

  <rect x="410" y="40" width="280" height="180" rx="8" fill="#09090B" stroke="#52525B" stroke-width="1.5"/>
  <text x="550" y="80" text-anchor="middle" fill="#D4D4D8" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">API LAYER</text>
  <text x="550" y="120" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">Django 5.2 + DRF</text>
  <text x="550" y="155" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Service layer · Event bus</text>
  <text x="550" y="180" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">JWT auth · simple_history</text>
  <text x="550" y="205" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">11 chain resolvers</text>

  <rect x="780" y="40" width="280" height="180" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="920" y="80" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">PERSISTENCE</text>
  <text x="920" y="120" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">PostgreSQL 16</text>
  <text x="920" y="155" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Snapshots: chain, body, header</text>
  <text x="920" y="180" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Indexed for_user / inbox</text>
  <text x="920" y="205" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Audit log per change</text>

  <rect x="40" y="280" width="280" height="160" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="180" y="320" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">ASYNC WORKERS</text>
  <text x="180" y="360" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">Celery 5.4</text>
  <text x="180" y="395" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Beat: SLA breach (1h)</text>
  <text x="180" y="420" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">PDF cache cleanup (24h)</text>

  <rect x="410" y="280" width="280" height="160" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="550" y="320" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">CACHE / BROKER</text>
  <text x="550" y="360" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">Redis 7</text>
  <text x="550" y="395" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Celery queue · WebSocket</text>
  <text x="550" y="420" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">Notification dedup</text>

  <rect x="780" y="280" width="280" height="160" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="920" y="320" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">RENDERING</text>
  <text x="920" y="360" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="600">Playwright</text>
  <text x="920" y="395" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">HTML → PDF generation</text>
  <text x="920" y="420" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="14">7-day cache · invalidation</text>

  <line x1="320" y1="130" x2="408" y2="130" stroke="#52525B" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="690" y1="130" x2="778" y2="130" stroke="#52525B" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="550" y1="220" x2="550" y2="280" stroke="#52525B" stroke-width="1.5" marker-end="url(#arrow)" stroke-dasharray="4 4"/>
  <line x1="180" y1="280" x2="500" y2="240" stroke="#52525B" stroke-width="1" stroke-dasharray="4 4"/>
  <line x1="900" y1="280" x2="600" y2="240" stroke="#52525B" stroke-width="1" stroke-dasharray="4 4"/>
</svg>

---

## Цифры, на которых стоим

<div class="stats-grid">

<div class="stat-card">
<span class="stat-num">9</span>
<span class="stat-label">Типов документов из коробки</span>
</div>

<div class="stat-card">
<span class="stat-num">11</span>
<span class="stat-label">Резолверов ролей в цепочке</span>
</div>

<div class="stat-card">
<span class="stat-num">266</span>
<span class="stat-label">Backend-тестов (зелёных)</span>
</div>

<div class="stat-card">
<span class="stat-num">14</span>
<span class="stat-label">Миграций модуля</span>
</div>

<div class="stat-card">
<span class="stat-num">4</span>
<span class="stat-label">Фазы плана выпуска</span>
</div>

<div class="stat-card">
<span class="stat-num">8</span>
<span class="stat-label">Страниц с inline-help</span>
</div>

<div class="stat-card">
<span class="stat-num">50+</span>
<span class="stat-label">Сценариев в QA-плане</span>
</div>

<div class="stat-card">
<span class="stat-num">0₽</span>
<span class="stat-label">Лицензии (наша разработка)</span>
</div>

</div>

---

<div class="num">01</div>

# Документы

<div class="lead">
9 типов покрывают 95% типового внутреннего документооборота.
Дальше — конструктор без программирования.
</div>

---

<!-- _class: compact -->

## Каталог

<div class="grid-3">

<div class="card">
<div class="icon">📄</div>
<h3>Служебные записки</h3>
<ul>
<li>Свободная форма</li>
<li>На переработку</li>
<li>На премирование (мес/кв)</li>
</ul>
<span class="pill">memo_*</span>
</div>

<div class="card">
<div class="icon">📋</div>
<h3>Заявления</h3>
<ul>
<li>Отгул с отработкой</li>
<li>Отгул за свой счёт</li>
<li>Свободная форма</li>
</ul>
<span class="pill">app_*</span>
</div>

<div class="card">
<div class="icon">🔔</div>
<h3>Уведомления</h3>
<ul>
<li>Об отпуске сотруднику</li>
<li><strong>Обратный поток</strong> — создаёт бухгалтер</li>
</ul>
<span class="pill">vacation_notification</span>
</div>

<div class="card">
<div class="icon">✈️</div>
<h3>Командировки</h3>
<ul>
<li>Смета расходов</li>
<li>Авторасчёт итога</li>
<li>Подпись директора</li>
</ul>
<span class="pill">travel_estimate</span>
</div>

<div class="card">
<div class="icon">🏆</div>
<h3>Премирование</h3>
<ul>
<li>Ежемесячное</li>
<li>Квартальное</li>
<li>Табличные списки</li>
</ul>
<span class="pill">memo_bonus_*</span>
</div>

<div class="card" style="border-color: #52525B;">
<div class="icon">⚙️</div>
<h3>Свой тип</h3>
<ul>
<li>Через админ-UI</li>
<li>Поля + шаблон + цепочка</li>
<li>Без программирования</li>
</ul>
<span class="pill pill-accent">low-code</span>
</div>

</div>

---

## Жизненный цикл документа

<svg viewBox="0 0 1100 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar1" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <rect x="40" y="150" width="180" height="80" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="130" y="185" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="16" font-weight="600">DRAFT</text>
  <text x="130" y="208" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="13">Черновик</text>

  <rect x="320" y="150" width="180" height="80" rx="8" fill="#18181B" stroke="#52525B" stroke-width="1.5"/>
  <text x="410" y="185" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="16" font-weight="600">PENDING</text>
  <text x="410" y="208" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="13">На согласовании</text>

  <rect x="800" y="40" width="180" height="80" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="890" y="75" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="16" font-weight="600">APPROVED</text>
  <text x="890" y="98" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="13">Согласовано</text>

  <rect x="800" y="150" width="180" height="80" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="890" y="185" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="16" font-weight="600">REJECTED</text>
  <text x="890" y="208" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="13">Отклонено</text>

  <rect x="800" y="260" width="180" height="80" rx="8" fill="#09090B" stroke="#27272A" stroke-width="1"/>
  <text x="890" y="295" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="16" font-weight="600">CANCELLED</text>
  <text x="890" y="318" text-anchor="middle" fill="#52525B" font-family="sans-serif" font-size="13">Отменён</text>

  <rect x="320" y="260" width="180" height="80" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="410" y="295" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="16" font-weight="600">REVISION_REQ</text>
  <text x="410" y="318" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="13">Запрошены правки</text>

  <line x1="220" y1="190" x2="318" y2="190" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar1)"/>
  <text x="265" y="180" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="12" font-weight="500">submit</text>

  <path d="M 500 175 Q 650 100 798 80" stroke="#52525B" stroke-width="1.5" fill="none" marker-end="url(#ar1)"/>
  <text x="650" y="120" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="12" font-weight="500">approve all</text>

  <line x1="500" y1="190" x2="798" y2="190" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar1)"/>
  <text x="650" y="180" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="12" font-weight="500">reject</text>

  <path d="M 410 230 Q 410 245 410 258" stroke="#52525B" stroke-width="1.5" fill="none" marker-end="url(#ar1)"/>
  <text x="475" y="250" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="12" font-weight="500">request revision</text>

  <path d="M 320 295 Q 200 290 130 235" stroke="#52525B" stroke-width="1.5" fill="none" marker-end="url(#ar1)"/>
  <text x="200" y="285" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="12" font-weight="500">edit + resubmit</text>

  <path d="M 500 215 Q 650 250 798 295" stroke="#3F3F46" stroke-width="1.5" fill="none" marker-end="url(#ar1)" stroke-dasharray="4 3"/>
  <text x="650" y="270" text-anchor="middle" fill="#71717A" font-family="sans-serif" font-size="12" font-weight="500">cancel (author)</text>
</svg>

---

<div class="num">02</div>

# Цепочки согласования

<div class="lead">
Кто согласует — определяется не вручную, а формулой.
Sequential, parallel, AND/OR — всё через UI.
</div>

---

## Пример: смета на командировку

<svg viewBox="0 0 1100 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <rect x="40" y="80" width="220" height="120" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="60" y="115" fill="#71717A" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="1">ШАГ 1 · APPROVE</text>
  <text x="60" y="148" fill="#FAFAFA" font-family="sans-serif" font-size="18" font-weight="600">Руководитель</text>
  <text x="60" y="174" fill="#A1A1AA" font-family="sans-serif" font-size="14">role_key: supervisor</text>
  <text x="60" y="195" fill="#A1A1AA" font-family="sans-serif" font-size="14">SLA: 24 ч</text>

  <line x1="265" y1="140" x2="338" y2="140" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar2)"/>

  <rect x="345" y="80" width="220" height="120" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="365" y="115" fill="#71717A" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="1">ШАГ 2 · APPROVE</text>
  <text x="365" y="148" fill="#FAFAFA" font-family="sans-serif" font-size="18" font-weight="600">Бухгалтерия</text>
  <text x="365" y="174" fill="#A1A1AA" font-family="sans-serif" font-size="14">group:accounting</text>
  <text x="365" y="195" fill="#A1A1AA" font-family="sans-serif" font-size="14">SLA: 72 ч</text>

  <line x1="570" y1="140" x2="643" y2="140" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar2)"/>

  <rect x="650" y="80" width="220" height="120" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="670" y="115" fill="#71717A" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="1">ШАГ 3 · SIGN ✍</text>
  <text x="670" y="148" fill="#FAFAFA" font-family="sans-serif" font-size="18" font-weight="600">Директор</text>
  <text x="670" y="174" fill="#A1A1AA" font-family="sans-serif" font-size="14">company_head</text>
  <text x="670" y="195" fill="#A1A1AA" font-family="sans-serif" font-size="14">SLA: 48 ч · подпись</text>

  <line x1="875" y1="140" x2="948" y2="140" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar2)"/>

  <rect x="955" y="100" width="120" height="80" rx="8" fill="#18181B" stroke="#52525B" stroke-width="1.5"/>
  <text x="1015" y="135" text-anchor="middle" fill="#FAFAFA" font-family="sans-serif" font-size="14" font-weight="600">PDF</text>
  <text x="1015" y="158" text-anchor="middle" fill="#A1A1AA" font-family="sans-serif" font-size="13">в архив</text>

  <text x="60" y="50" fill="#71717A" font-family="sans-serif" font-size="13">Снепшот цепочки фиксируется на submit'е — задним числом не меняется</text>
</svg>

<br>

> **Снепшот цепочки** замораживается на submit. Если админ потом изменит шаблон —
> старые документы останутся со своей оригинальной цепочкой. Так устроен audit-trail.

---

## Параллельные ветки

<div class="grid-2">

<div class="card">

<h3>AND-режим</h3>

<svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar-and" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>
  <rect x="20" y="115" width="100" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="70" y="145" text-anchor="middle" fill="#A1A1AA" font-size="13">Руковод.</text>
  <line x1="125" y1="140" x2="170" y2="60" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-and)"/>
  <line x1="125" y1="140" x2="170" y2="220" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-and)"/>
  <rect x="175" y="35" width="120" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="235" y="65" text-anchor="middle" fill="#FAFAFA" font-size="13" font-weight="600">Бухгалтерия</text>
  <rect x="175" y="195" width="120" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="235" y="225" text-anchor="middle" fill="#FAFAFA" font-size="13" font-weight="600">Юрист</text>
  <line x1="300" y1="60" x2="345" y2="120" stroke="#52525B" stroke-width="1.5"/>
  <line x1="300" y1="220" x2="345" y2="160" stroke="#52525B" stroke-width="1.5"/>
  <rect x="345" y="115" width="100" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="395" y="145" text-anchor="middle" fill="#FAFAFA" font-size="13" font-weight="600">Директор</text>

  <text x="240" y="20" text-anchor="middle" fill="#71717A" font-size="12">parallel_group="review", AND</text>
</svg>

<p class="small"><strong>Все</strong> в группе должны одобрить. Любой <code>reject</code> → документ rejected. Удобно когда нужны независимые проверки.</p>

</div>

<div class="card">

<h3>OR-режим</h3>

<svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar-or" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
    <marker id="ar-skip" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#3F3F46">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>
  <rect x="20" y="115" width="100" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="70" y="145" text-anchor="middle" fill="#A1A1AA" font-size="13">Подача</text>

  <line x1="125" y1="140" x2="170" y2="60" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-or)"/>
  <line x1="125" y1="140" x2="170" y2="140" stroke="#3F3F46" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#ar-skip)"/>
  <line x1="125" y1="140" x2="170" y2="220" stroke="#3F3F46" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#ar-skip)"/>

  <rect x="175" y="35" width="120" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="235" y="58" text-anchor="middle" fill="#FAFAFA" font-size="12" font-weight="600">Дир. №1</text>
  <text x="235" y="76" text-anchor="middle" fill="#71717A" font-size="10">approved ✓</text>

  <rect x="175" y="115" width="120" height="50" rx="6" fill="#000000" stroke="#27272A" stroke-dasharray="2 2"/>
  <text x="235" y="138" text-anchor="middle" fill="#71717A" font-size="12">Дир. №2</text>
  <text x="235" y="156" text-anchor="middle" fill="#52525B" font-size="10">skipped</text>

  <rect x="175" y="195" width="120" height="50" rx="6" fill="#000000" stroke="#27272A" stroke-dasharray="2 2"/>
  <text x="235" y="218" text-anchor="middle" fill="#71717A" font-size="12">Дир. №3</text>
  <text x="235" y="236" text-anchor="middle" fill="#52525B" font-size="10">skipped</text>

  <line x1="300" y1="60" x2="345" y2="140" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-or)"/>
  <rect x="345" y="115" width="100" height="50" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="395" y="145" text-anchor="middle" fill="#FAFAFA" font-size="13" font-weight="600">Готово</text>

  <text x="240" y="20" text-anchor="middle" fill="#71717A" font-size="12">parallel_group="any", OR</text>
</svg>

<p class="small"><strong>Любой один</strong> approve → остальные в SKIPPED, идём дальше. Reject не блокирует. Удобно для дублирующих ролей.</p>

</div>

</div>

---

<!-- _class: compact -->

## Резолверы — формулы вместо имён

<svg viewBox="0 0 1100 380" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="40" width="280" height="60" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="60" y="65" fill="#71717A" font-size="10" font-weight="600" letter-spacing="1">DEPTH 1 · MANAGEMENT</text>
  <text x="60" y="88" fill="#FAFAFA" font-size="16" font-weight="600">Управляющий ГК</text>

  <line x1="180" y1="100" x2="180" y2="118" stroke="#3F3F46" stroke-width="1.5"/>

  <rect x="40" y="120" width="280" height="60" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="60" y="145" fill="#71717A" font-size="10" font-weight="600" letter-spacing="1">DEPTH 2 · DIVISION</text>
  <text x="60" y="168" fill="#FAFAFA" font-size="16" font-weight="600">Технический директор</text>

  <line x1="180" y1="180" x2="180" y2="198" stroke="#3F3F46" stroke-width="1.5"/>

  <rect x="40" y="200" width="280" height="60" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="60" y="225" fill="#71717A" font-size="10" font-weight="600" letter-spacing="1">DEPTH 3 · SERVICE</text>
  <text x="60" y="248" fill="#FAFAFA" font-size="16" font-weight="600">Служба РЗА</text>

  <line x1="180" y1="260" x2="180" y2="278" stroke="#3F3F46" stroke-width="1.5"/>

  <rect x="40" y="280" width="280" height="60" rx="6" fill="#09090B" stroke="#3F3F46"/>
  <text x="60" y="305" fill="#A1A1AA" font-size="10" font-weight="600" letter-spacing="1">DEPTH 4 · DEPARTMENT</text>
  <text x="60" y="328" fill="#FAFAFA" font-size="16" font-weight="600">Отдел РЗА 1 ← автор тут</text>

  <text x="380" y="80" fill="#71717A" font-size="12" font-weight="600" letter-spacing="1">FORMULA</text>
  <rect x="380" y="100" width="350" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="395" y="123" fill="#D4D4D8" font-size="13" font-family="JetBrains Mono">supervisor</text>
  <text x="395" y="142" fill="#71717A" font-size="12">→ head моего отдела</text>

  <rect x="380" y="160" width="350" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="395" y="183" fill="#D4D4D8" font-size="13" font-family="JetBrains Mono">dept_head_type:service</text>
  <text x="395" y="202" fill="#71717A" font-size="12">→ head ближайшей службы вверх</text>

  <rect x="380" y="220" width="350" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="395" y="243" fill="#D4D4D8" font-size="13" font-family="JetBrains Mono">dept_head_type:division</text>
  <text x="395" y="262" fill="#71717A" font-size="12">→ head ближайшей дирекции вверх</text>

  <rect x="380" y="280" width="350" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="395" y="303" fill="#D4D4D8" font-size="13" font-family="JetBrains Mono">company_head</text>
  <text x="395" y="322" fill="#71717A" font-size="12">→ верхушка компании</text>

  <text x="780" y="80" fill="#71717A" font-size="12" font-weight="600" letter-spacing="1">RESOLVES TO</text>
  <rect x="780" y="100" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="800" y="125" fill="#FAFAFA" font-size="14" font-weight="600">Бычков Ю. В.</text>
  <text x="800" y="143" fill="#71717A" font-size="12">head «Отдел РЗА 1»</text>

  <rect x="780" y="160" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="800" y="185" fill="#FAFAFA" font-size="14" font-weight="600">Сидоров С. С.</text>
  <text x="800" y="203" fill="#71717A" font-size="12">head «Служба РЗА»</text>

  <rect x="780" y="220" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="800" y="245" fill="#FAFAFA" font-size="14" font-weight="600">Петров П. П.</text>
  <text x="800" y="263" fill="#71717A" font-size="12">head «Технический директор»</text>

  <rect x="780" y="280" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="800" y="305" fill="#FAFAFA" font-size="14" font-weight="600">Ефимов М. Н.</text>
  <text x="800" y="323" fill="#71717A" font-size="12">head «Управляющий ГК»</text>
</svg>

<p class="small center muted">11 формул — supervisor, dept_head_type:*, company_head, group:*, fixed_user:N, field_user:*, author и др.<br>Цепочка остаётся валидной даже после кадровых перестановок.</p>

---

<div class="num">03</div>

# Удобство пользователя

<div class="lead">
Не «вход в админку, заполнение 12 полей, скрепить степлером».
Каждый день, не раз в год.
</div>

---

## Email-link одобрение

<svg viewBox="0 0 1100 360" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar-flow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#52525B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <circle cx="120" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="120" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">1</text>
  <text x="120" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Шаг активирован</text>
  <text x="120" y="160" text-anchor="middle" fill="#71717A" font-size="12">Система генерирует</text>
  <text x="120" y="176" text-anchor="middle" fill="#71717A" font-size="12">подписанный токен</text>

  <line x1="160" y1="80" x2="250" y2="80" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-flow)"/>

  <circle cx="290" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="290" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">2</text>
  <text x="290" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Email отправлен</text>
  <text x="290" y="160" text-anchor="middle" fill="#71717A" font-size="12">с двумя ссылками:</text>
  <text x="290" y="176" text-anchor="middle" fill="#71717A" font-size="12">Approve / Reject</text>

  <line x1="330" y1="80" x2="420" y2="80" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-flow)"/>

  <circle cx="460" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="460" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">3</text>
  <text x="460" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Клик по ссылке</text>
  <text x="460" y="160" text-anchor="middle" fill="#71717A" font-size="12">Открывается страница</text>
  <text x="460" y="176" text-anchor="middle" fill="#71717A" font-size="12">без логина</text>

  <line x1="500" y1="80" x2="590" y2="80" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-flow)"/>

  <circle cx="630" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="630" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">4</text>
  <text x="630" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Проверка токена</text>
  <text x="630" y="160" text-anchor="middle" fill="#71717A" font-size="12">Подпись валидна?</text>
  <text x="630" y="176" text-anchor="middle" fill="#71717A" font-size="12">Шаг ещё открыт?</text>

  <line x1="670" y1="80" x2="760" y2="80" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-flow)"/>

  <circle cx="800" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="800" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">5</text>
  <text x="800" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Action выполнен</text>
  <text x="800" y="160" text-anchor="middle" fill="#71717A" font-size="12">Approve/reject</text>
  <text x="800" y="176" text-anchor="middle" fill="#71717A" font-size="12">через service-layer</text>

  <line x1="840" y1="80" x2="930" y2="80" stroke="#52525B" stroke-width="1.5" marker-end="url(#ar-flow)"/>

  <circle cx="970" cy="80" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="970" y="86" text-anchor="middle" fill="#A1A1AA" font-size="18" font-weight="600">6</text>
  <text x="970" y="140" text-anchor="middle" fill="#FAFAFA" font-size="14" font-weight="600">Цепочка движется</text>
  <text x="970" y="160" text-anchor="middle" fill="#71717A" font-size="12">Следующий шаг или</text>
  <text x="970" y="176" text-anchor="middle" fill="#71717A" font-size="12">PDF в архив</text>

  <rect x="380" y="240" width="340" height="100" rx="12" fill="#09090B" stroke="#27272A" stroke-width="1"/>
  <text x="400" y="268" fill="#71717A" font-size="11" font-weight="600" letter-spacing="1">📱 EMAIL-КЛИЕНТ</text>
  <text x="400" y="292" fill="#FAFAFA" font-size="15" font-weight="600">Новый документ на согласование</text>
  <rect x="400" y="305" width="130" height="24" rx="4" fill="#18181B" stroke="#3F3F46"/>
  <text x="465" y="321" text-anchor="middle" fill="#D4D4D8" font-size="11" font-weight="600">✓ Согласовать</text>
  <rect x="540" y="305" width="120" height="24" rx="4" fill="#09090B" stroke="#27272A"/>
  <text x="600" y="321" text-anchor="middle" fill="#71717A" font-size="11" font-weight="600">✗ Отклонить</text>
</svg>

<p class="small center"><strong>Логин не нужен.</strong> Авторизация по подписанному токену.<br>Ссылка одноразовая · защищена от подмены подписью SECRET_KEY.</p>

---

## Замещение и SLA-эскалация

<div class="grid-2">

<div class="card">

<h3>🏖 Замещение на отпуск</h3>

<p>Сотрудник уезжает — все его новые шаги автоматически уходят замещающему.</p>
```
до 01.05  → шаги ждут оригинала
01.05 — 14.05  → шаги уходят замещающему
                 original_approver = оригинал (audit)
с 15.05  → снова оригиналу
```
<p class="small">Уже PENDING-шаги не перерезолвятся — это by design: по ним кнопка «Делегировать» в UI.</p>

</div>

<div class="card">

<h3>⏱ SLA + эскалация</h3>

<p>Каждый шаг имеет срок. Просрочка → автоматические уведомления.</p>
```
SLA 24 ч → шаг pending уже 27 ч
   ↓
Celery Beat (1h cron) фиксирует
   ↓
Уведомления:
 • автору документа
 • согласующему (напоминание)
 • его руководителю (эскалация)
```
<p class="small">Один шаг помечается просроченным один раз — без спама.</p>

</div>

</div>

---

<!-- _class: compact -->

## Anatomy PDF-документа

<svg viewBox="0 0 1100 480" xmlns="http://www.w3.org/2000/svg">
  <rect x="350" y="20" width="400" height="440" rx="4" fill="#FAFAFA" stroke="#D4D4D8" stroke-width="1"/>

  <rect x="370" y="40" width="200" height="70" fill="#F4F4F5" rx="2"/>
  <text x="380" y="62" fill="#18181B" font-size="11" font-weight="600">НПП БРЕСЛЕР</text>
  <text x="380" y="80" fill="#52525B" font-size="10">Управляющий ГК</text>
  <text x="380" y="95" fill="#52525B" font-size="10">Ефимов М. Н.</text>

  <rect x="585" y="40" width="145" height="70" fill="#F4F4F5" rx="2"/>
  <text x="595" y="62" fill="#18181B" font-size="11" font-weight="600">КОМУ:</text>
  <text x="595" y="80" fill="#52525B" font-size="10">Бухгалтерии</text>
  <text x="595" y="95" fill="#52525B" font-size="10">НПП БРЕСЛЕР</text>

  <text x="550" y="140" text-anchor="middle" fill="#18181B" font-size="14" font-weight="600">Смета на командировку</text>
  <line x1="450" y1="148" x2="650" y2="148" stroke="#D4D4D8" stroke-width="1"/>

  <text x="550" y="170" text-anchor="middle" fill="#71717A" font-size="9">№ КОМАНД-СМЕТА-2026-0042 от 26.04.2026</text>

  <rect x="370" y="190" width="360" height="180" fill="#FFFFFF" stroke="#E4E4E7" rx="2"/>
  <text x="380" y="210" fill="#18181B" font-size="9">Прошу утвердить смету расходов на</text>
  <text x="380" y="222" fill="#18181B" font-size="9">служебную командировку.</text>
  <text x="380" y="244" fill="#18181B" font-size="9">Город: Санкт-Петербург</text>
  <text x="380" y="256" fill="#18181B" font-size="9">Период: 01.06.2026 — 05.06.2026</text>
  <text x="380" y="278" fill="#18181B" font-size="9" font-weight="600">Расходы:</text>
  <text x="380" y="292" fill="#52525B" font-size="9">  Транспорт:    8 500 ₽</text>
  <text x="380" y="304" fill="#52525B" font-size="9">  Проживание: 12 000 ₽</text>
  <text x="380" y="316" fill="#52525B" font-size="9">  Суточные:     4 900 ₽</text>
  <text x="380" y="334" fill="#18181B" font-size="10" font-weight="600">  ИТОГО:    25 400 ₽</text>

  <text x="380" y="395" fill="#52525B" font-size="9">26.04.2026</text>
  <line x1="540" y1="405" x2="720" y2="405" stroke="#18181B"/>
  <path d="M 555 392 Q 580 380 605 395 T 660 388" stroke="#18181B" stroke-width="1" fill="none"/>
  <text x="630" y="425" text-anchor="middle" fill="#18181B" font-size="9" font-weight="600">Терентьев А. Ю.</text>

  <line x1="120" y1="75" x2="370" y2="75" stroke="#52525B" stroke-dasharray="2 2"/>
  <rect x="20" y="55" width="260" height="40" rx="4" fill="#09090B" stroke="#27272A"/>
  <text x="30" y="75" fill="#FAFAFA" font-size="10" font-weight="600">ШАПКА КОМПАНИИ</text>
  <text x="30" y="90" fill="#71717A" font-size="10">справочник OrgUnitHead</text>

  <line x1="280" y1="270" x2="370" y2="270" stroke="#52525B" stroke-dasharray="2 2"/>
  <rect x="20" y="250" width="260" height="40" rx="4" fill="#09090B" stroke="#27272A"/>
  <text x="30" y="270" fill="#FAFAFA" font-size="10" font-weight="600">ТЕЛО ДОКУМЕНТА</text>
  <text x="30" y="285" fill="#71717A" font-size="10">DTL-шаблон + значения полей</text>

  <line x1="280" y1="395" x2="540" y2="395" stroke="#52525B" stroke-dasharray="2 2"/>
  <rect x="20" y="375" width="260" height="40" rx="4" fill="#09090B" stroke="#27272A"/>
  <text x="30" y="395" fill="#FAFAFA" font-size="10" font-weight="600">CANVAS-ПОДПИСЬ</text>
  <text x="30" y="410" fill="#71717A" font-size="10">data:image/png</text>

  <line x1="780" y1="225" x2="850" y2="225" stroke="#52525B" stroke-dasharray="2 2"/>
  <rect x="850" y="205" width="240" height="40" rx="4" fill="#09090B" stroke="#27272A"/>
  <text x="860" y="225" fill="#FAFAFA" font-size="10" font-weight="600">КЕШ 7 ДНЕЙ</text>
  <text x="860" y="240" fill="#71717A" font-size="10">регенерация при изменениях</text>
</svg>

---

<div class="num">04</div>

# Для администратора

<div class="lead">
Конструктор без программирования.
Отчёты, диагностика, audit.
</div>

---

## Конструктор типов · low-code

<div class="grid-2">

<div class="card">

<h3>📝 Поля формы</h3>

<p>Визуальный редактор field_schema:</p>
<ul>
<li>14 типов полей (text, money, choice...)</li>
<li>Conditional блоки и колонки</li>
<li>Validation на сохранении</li>
</ul>

</div>

<div class="card">

<h3>📐 Шаблоны</h3>

<p>Django Template Language:</p>
<ul>
<li>Доступ к <code>author</code>, <code>today</code>, <code>fields</code></li>
<li>Auto-escape, безопасность</li>
<li>Live-preview при редактировании</li>
</ul>

</div>

<div class="card">

<h3>🔗 Цепочка</h3>

<p>Drag-and-drop конструктор шагов:</p>
<ul>
<li>11 пресетов role_key + custom</li>
<li>Параллельные группы AND/OR</li>
<li>SLA в часах per-step</li>
</ul>

</div>

<div class="card">

<h3>🎯 Параметры</h3>

<p>Per-type настройки:</p>
<ul>
<li>Visibility (personal / dept / public)</li>
<li>Кто может создавать</li>
<li>Обязательность подписи canvas</li>
</ul>

</div>

</div>

---

<!-- _class: compact -->

## Audit и снепшоты

<svg viewBox="0 0 1100 320" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="40" width="280" height="240" rx="8" fill="#09090B" stroke="#3F3F46" stroke-width="1"/>
  <text x="60" y="75" fill="#71717A" font-size="11" font-weight="600" letter-spacing="1">МОМЕНТ SUBMIT</text>
  <text x="60" y="105" fill="#FAFAFA" font-size="18" font-weight="600">Снепшоты в БД</text>

  <text x="60" y="145" fill="#D4D4D8" font-size="13" font-weight="600">chain_snapshot</text>
  <text x="60" y="163" fill="#71717A" font-size="12">JSON цепочки на момент</text>

  <text x="60" y="195" fill="#D4D4D8" font-size="13" font-weight="600">body_rendered</text>
  <text x="60" y="213" fill="#71717A" font-size="12">Отрендеренный текст</text>

  <text x="60" y="245" fill="#D4D4D8" font-size="13" font-weight="600">header_snapshot</text>
  <text x="60" y="263" fill="#71717A" font-size="12">Компания + директор</text>

  <text x="490" y="70" fill="#71717A" font-size="12" font-weight="600" letter-spacing="1">ПОСЛЕДСТВИЯ</text>

  <rect x="370" y="90" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="385" y="115" fill="#D4D4D8" font-size="13" font-weight="600">Смена типа документа</text>
  <text x="385" y="132" fill="#71717A" font-size="11">Старые идут по своей цепочке</text>

  <rect x="370" y="155" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="385" y="180" fill="#D4D4D8" font-size="13" font-weight="600">Смена директора</text>
  <text x="385" y="197" fill="#71717A" font-size="11">PDF-архив сохраняет старого</text>

  <rect x="370" y="220" width="280" height="50" rx="6" fill="#09090B" stroke="#27272A"/>
  <text x="385" y="245" fill="#D4D4D8" font-size="13" font-weight="600">Кадровые перестановки</text>
  <text x="385" y="262" fill="#71717A" font-size="11">История решений нерушима</text>

  <rect x="700" y="40" width="360" height="240" rx="8" fill="#111113" stroke="#3F3F46" stroke-width="1"/>
  <text x="720" y="75" fill="#A1A1AA" font-size="11" font-weight="600" letter-spacing="1">РЕЗУЛЬТАТ</text>
  <text x="720" y="105" fill="#FAFAFA" font-size="18" font-weight="600">Audit-grade архив</text>

  <text x="720" y="142" fill="#D4D4D8" font-size="13">✓ Каждое решение фиксировано</text>
  <text x="720" y="166" fill="#D4D4D8" font-size="13">✓ Кто, когда, какой комментарий</text>
  <text x="720" y="190" fill="#D4D4D8" font-size="13">✓ simple_history на всех моделях</text>
  <text x="720" y="214" fill="#D4D4D8" font-size="13">✓ original_approver при делегировании</text>
  <text x="720" y="238" fill="#D4D4D8" font-size="13">✓ PDF-копия с подписями</text>
</svg>

---

<div class="num">05</div>

# Зрелость и сравнение

<div class="lead">
Где мы относительно Enterprise решений.
Почему делали сами, а не покупали.
</div>

---

<!-- _class: compact -->

## Сравнение с рыночными СЭДО

<div class="compare">
  <div class="compare-head">Возможность</div>
  <div class="compare-head">DIRECTUM / Tezis</div>
  <div class="compare-head">1С:ДО</div>
  <div class="compare-head brand">Bresler ЭДО</div>
</div>

<div class="compare-row">
  <div class="compare-cell">Типизированные формы</div>
  <div class="compare-cell"><span class="y">✓</span> Да</div>
  <div class="compare-cell"><span class="y">✓</span> Да</div>
  <div class="compare-cell"><span class="y">✓</span> Да</div>
</div>

<div class="compare-row">
  <div class="compare-cell">Конструктор типов UI</div>
  <div class="compare-cell muted">BPMN-style сложный</div>
  <div class="compare-cell muted">Конфигуратор 1С</div>
  <div class="compare-cell"><span class="y">✓</span> Простой визуальный</div>
</div>

<div class="compare-row">
  <div class="compare-cell">КЭП через провайдеров</div>
  <div class="compare-cell"><span class="y">✓</span> Нативно</div>
  <div class="compare-cell"><span class="y">✓</span> Да</div>
  <div class="compare-cell muted">В roadmap (Q3 2026)</div>
</div>

<div class="compare-row">
  <div class="compare-cell">Интеграция с ERP</div>
  <div class="compare-cell muted">Внешняя шина</div>
  <div class="compare-cell"><span class="y">✓</span> Часть платформы</div>
  <div class="compare-cell"><span class="y">✓</span> Общие модели</div>
</div>

<div class="compare-row">
  <div class="compare-cell">Контроль кода</div>
  <div class="compare-cell"><span class="n">✗</span> Vendor lock-in</div>
  <div class="compare-cell"><span class="n">✗</span> Vendor lock-in</div>
  <div class="compare-cell"><span class="y">✓</span> Наша разработка</div>
</div>

<div class="compare-row highlight">
  <div class="compare-cell">Стоимость лицензии</div>
  <div class="compare-cell muted">от 100 000 ₽ / юзер</div>
  <div class="compare-cell muted">от 5 000 ₽ / юзер</div>
  <div class="compare-cell">0 ₽</div>
</div>

<p class="small center" style="margin-top:10px">Закрываем 90% потребностей при нулевой лицензионной стоимости.</p>

---

# Спасибо

<div class="tagline">

**Bresler ERP · ЭДО** — модуль готов к ежедневной работе.

</div>

<div style="margin-top: 60px;">

📂 **Документация:** `docs/edo_user_guide.md`
🧪 **Тест-сценарии:** `docs/edo_test_scenarios.md`
📧 **Контакт:** ds9554@chebnet.com

</div>