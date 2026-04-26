---
marp: true
theme: default
paginate: true
size: 16:9
backgroundColor: '#0F172A'
color: '#E2E8F0'
header: ''
footer: 'Bresler ERP · ЭДО · 2026'
style: |
  /* ============== БАЗОВАЯ ТИПОГРАФИКА ============== */
  section {
    font-family: -apple-system, "SF Pro Display", "Segoe UI", "Inter", sans-serif;
    padding: 56px 80px;
    font-size: 24px;
    line-height: 1.5;
    background: #0F172A;
    color: #E2E8F0;
    position: relative;
  }
  section::after {
    color: #475569;
    font-size: 14px;
  }
  header, footer {
    color: #475569;
    font-size: 13px;
    letter-spacing: 0.05em;
  }

  /* ============== ЗАГОЛОВКИ ============== */
  h1 {
    font-size: 60px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #F8FAFC;
    margin: 0 0 0.3em;
    line-height: 1.05;
  }
  h2 {
    font-size: 40px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #F8FAFC;
    margin: 0 0 0.5em;
    line-height: 1.1;
    background: linear-gradient(90deg, #06B6D4 0%, #3B82F6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  h2.plain {
    background: none;
    -webkit-text-fill-color: #F8FAFC;
    color: #F8FAFC;
  }
  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #06B6D4;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.4em;
  }

  /* ============== ТЕКСТ ============== */
  strong { color: #F8FAFC; font-weight: 700; }
  em { color: #94A3B8; font-style: normal; }
  code {
    background: #1E293B;
    color: #67E8F9;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    font-family: "JetBrains Mono", "SF Mono", monospace;
  }
  pre {
    background: #020617;
    border: 1px solid #1E293B;
    border-radius: 12px;
    padding: 18px 22px;
    font-size: 18px;
    line-height: 1.6;
    color: #CBD5E1;
  }
  ul, ol { padding-left: 1.4em; }
  li { margin: 0.4em 0; }
  blockquote {
    border-left: 3px solid #06B6D4;
    padding: 12px 22px;
    margin: 1em 0;
    background: rgba(6, 182, 212, 0.07);
    color: #CBD5E1;
    font-size: 22px;
    border-radius: 0 8px 8px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 22px;
    margin: 0.6em 0;
  }
  th {
    background: rgba(6, 182, 212, 0.12);
    color: #67E8F9;
    padding: 12px 16px;
    text-align: left;
    text-transform: uppercase;
    font-size: 14px;
    letter-spacing: 0.08em;
    border-bottom: 1px solid #06B6D4;
  }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid #1E293B;
    color: #CBD5E1;
  }
  tr:hover td { background: rgba(255,255,255,0.02); }

  /* ============== TITLE / SECTION SLIDES ============== */
  section.title {
    background:
      radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.18) 0%, transparent 40%),
      linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    padding: 100px 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title h1 {
    font-size: 84px;
    background: linear-gradient(135deg, #67E8F9 0%, #3B82F6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 20px;
  }
  section.title .tagline {
    font-size: 28px;
    color: #94A3B8;
    font-weight: 400;
    max-width: 900px;
    line-height: 1.4;
  }
  section.title .meta {
    margin-top: 60px;
    color: #475569;
    font-size: 16px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  section.section {
    background:
      radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
      linear-gradient(180deg, #020617 0%, #0F172A 100%);
    text-align: center;
    padding-top: 140px;
  }
  section.section .num {
    color: #06B6D4;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.2em;
    margin-bottom: 16px;
  }
  section.section h1 {
    font-size: 90px;
    background: linear-gradient(135deg, #67E8F9 0%, #3B82F6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  section.section .lead {
    color: #94A3B8;
    font-size: 26px;
    max-width: 800px;
    margin: 30px auto 0;
    line-height: 1.5;
  }

  /* ============== STATS ============== */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-top: 30px;
  }
  .stat-card {
    background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
    border: 1px solid #334155;
    border-radius: 16px;
    padding: 32px 24px;
    text-align: left;
  }
  .stat-num {
    display: block;
    font-size: 56px;
    font-weight: 800;
    color: #06B6D4;
    line-height: 1;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .stat-label {
    font-size: 16px;
    color: #94A3B8;
    line-height: 1.4;
  }

  /* ============== CARDS ============== */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 16px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 22px 24px;
  }
  .card .icon {
    font-size: 32px;
    margin-bottom: 12px;
  }
  .card h3 {
    margin: 0 0 10px;
    color: #F8FAFC;
    font-size: 22px;
    text-transform: none;
    letter-spacing: 0;
  }
  .card p, .card ul {
    color: #94A3B8;
    font-size: 19px;
    margin: 0;
  }
  .card ul li { margin: 0.3em 0; }

  /* ============== PILLS / BADGES ============== */
  .pill {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-right: 6px;
  }
  .pill-cyan { background: rgba(6, 182, 212, 0.15); color: #67E8F9; border: 1px solid rgba(6, 182, 212, 0.3); }
  .pill-blue { background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.3); }
  .pill-amber { background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.3); }
  .pill-emerald { background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.3); }

  /* ============== SVG ============== */
  svg { display: block; margin: 0 auto; }

  /* ============== UTILS ============== */
  .center { text-align: center; }
  .muted { color: #64748B; }
  .small { font-size: 18px; }
  .lead-text {
    font-size: 30px;
    line-height: 1.4;
    color: #CBD5E1;
    max-width: 900px;
  }
---

<!-- _class: title -->

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

<br>

<div class="grid-2">

<div class="card">

<div class="icon">📁</div>

### Было

- Word/Excel-шаблоны на сетевых дисках
- Согласование по почте — копии писем теряются
- «У кого сейчас документ?» — никто не знает
- Архив = папка с файлами разных версий
- Просрочки видны постфактум

</div>

<div class="card" style="border-color: #06B6D4;">

<div class="icon">⚡</div>

### Стало

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
    <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0EA5E9" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1E40AF" stop-opacity="0.05"/>
    </linearGradient>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#475569">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <!-- Frontend -->
  <rect x="40" y="40" width="280" height="180" rx="14" fill="url(#grad-cyan)" stroke="#06B6D4" stroke-width="1.5"/>
  <text x="180" y="80" text-anchor="middle" fill="#06B6D4" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">FRONTEND</text>
  <text x="180" y="120" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">React 19 + TypeScript</text>
  <text x="180" y="155" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">TanStack Query · Tailwind</text>
  <text x="180" y="180" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">shadcn/ui · React Hook Form</text>
  <text x="180" y="205" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Canvas signature</text>

  <!-- Backend API -->
  <rect x="410" y="40" width="280" height="180" rx="14" fill="url(#grad-blue)" stroke="#3B82F6" stroke-width="1.5"/>
  <text x="550" y="80" text-anchor="middle" fill="#3B82F6" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">API LAYER</text>
  <text x="550" y="120" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">Django 5.2 + DRF</text>
  <text x="550" y="155" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Service layer · Event bus</text>
  <text x="550" y="180" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">JWT auth · simple_history</text>
  <text x="550" y="205" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">11 chain resolvers</text>

  <!-- DB -->
  <rect x="780" y="40" width="280" height="180" rx="14" fill="url(#grad-cyan)" stroke="#06B6D4" stroke-width="1.5"/>
  <text x="920" y="80" text-anchor="middle" fill="#06B6D4" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">PERSISTENCE</text>
  <text x="920" y="120" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">PostgreSQL 16</text>
  <text x="920" y="155" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Snapshots: chain, body, header</text>
  <text x="920" y="180" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Indexed for_user / inbox</text>
  <text x="920" y="205" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Audit log per change</text>

  <!-- Async / async row -->
  <rect x="40" y="280" width="280" height="160" rx="14" fill="rgba(245, 158, 11, 0.08)" stroke="#F59E0B" stroke-width="1.5"/>
  <text x="180" y="320" text-anchor="middle" fill="#F59E0B" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">ASYNC WORKERS</text>
  <text x="180" y="360" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">Celery 5.4</text>
  <text x="180" y="395" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Beat: SLA breach (1h)</text>
  <text x="180" y="420" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">PDF cache cleanup (24h)</text>

  <rect x="410" y="280" width="280" height="160" rx="14" fill="rgba(239, 68, 68, 0.08)" stroke="#EF4444" stroke-width="1.5"/>
  <text x="550" y="320" text-anchor="middle" fill="#EF4444" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">CACHE / BROKER</text>
  <text x="550" y="360" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">Redis 7</text>
  <text x="550" y="395" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Celery queue · WebSocket pub/sub</text>
  <text x="550" y="420" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">Notification dedup</text>

  <rect x="780" y="280" width="280" height="160" rx="14" fill="rgba(16, 185, 129, 0.08)" stroke="#10B981" stroke-width="1.5"/>
  <text x="920" y="320" text-anchor="middle" fill="#10B981" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="2">RENDERING</text>
  <text x="920" y="360" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="22" font-weight="700">Playwright</text>
  <text x="920" y="395" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">HTML → PDF generation</text>
  <text x="920" y="420" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">7-day cache · invalidation</text>

  <!-- Connecting arrows -->
  <line x1="320" y1="130" x2="408" y2="130" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="690" y1="130" x2="778" y2="130" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="550" y1="222" x2="550" y2="278" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" stroke-dasharray="4 4"/>
  <line x1="180" y1="280" x2="500" y2="240" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="900" y1="280" x2="600" y2="240" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 4"/>
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

<!-- _class: section -->

<div class="num">01</div>

# Документы

<div class="lead">
9 типов покрывают 95% типового внутреннего документооборота.
Дальше — конструктор без программирования.
</div>

---

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
<span class="pill pill-cyan">memo_*</span>
</div>

<div class="card">
<div class="icon">📋</div>
<h3>Заявления</h3>
<ul>
<li>Отгул с отработкой</li>
<li>Отгул за свой счёт</li>
<li>Свободная форма</li>
</ul>
<span class="pill pill-cyan">app_*</span>
</div>

<div class="card">
<div class="icon">🔔</div>
<h3>Уведомления</h3>
<ul>
<li>Об отпуске сотруднику</li>
<li><strong>Обратный поток</strong> — создаёт бухгалтер</li>
</ul>
<span class="pill pill-amber">vacation_notification</span>
</div>

<div class="card">
<div class="icon">✈️</div>
<h3>Командировки</h3>
<ul>
<li>Смета расходов</li>
<li>Авторасчёт итога</li>
<li>Подпись директора</li>
</ul>
<span class="pill pill-cyan">travel_estimate</span>
</div>

<div class="card">
<div class="icon">🏆</div>
<h3>Премирование</h3>
<ul>
<li>Ежемесячное</li>
<li>Квартальное</li>
<li>Табличные списки</li>
</ul>
<span class="pill pill-cyan">memo_bonus_*</span>
</div>

<div class="card" style="border-color: #06B6D4;">
<div class="icon">⚙️</div>
<h3>Свой тип</h3>
<ul>
<li>Через админ-UI</li>
<li>Поля + шаблон + цепочка</li>
<li>Без программирования</li>
</ul>
<span class="pill pill-emerald">low-code</span>
</div>

</div>

---

## Жизненный цикл документа

<svg viewBox="0 0 1100 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar1" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#06B6D4">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
    <marker id="ar-amber" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#F59E0B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
    <marker id="ar-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#10B981">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
    <marker id="ar-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#EF4444">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <!-- DRAFT -->
  <rect x="40" y="150" width="180" height="80" rx="40" fill="#1E293B" stroke="#64748B" stroke-width="2"/>
  <text x="130" y="185" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="700">DRAFT</text>
  <text x="130" y="208" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">Черновик</text>

  <!-- PENDING -->
  <rect x="320" y="150" width="180" height="80" rx="40" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" stroke-width="2"/>
  <text x="410" y="185" text-anchor="middle" fill="#67E8F9" font-family="sans-serif" font-size="20" font-weight="700">PENDING</text>
  <text x="410" y="208" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">На согласовании</text>

  <!-- APPROVED -->
  <rect x="800" y="40" width="180" height="80" rx="40" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" stroke-width="2"/>
  <text x="890" y="75" text-anchor="middle" fill="#6EE7B7" font-family="sans-serif" font-size="20" font-weight="700">APPROVED</text>
  <text x="890" y="98" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">Согласовано</text>

  <!-- REJECTED -->
  <rect x="800" y="150" width="180" height="80" rx="40" fill="rgba(239, 68, 68, 0.15)" stroke="#EF4444" stroke-width="2"/>
  <text x="890" y="185" text-anchor="middle" fill="#FCA5A5" font-family="sans-serif" font-size="20" font-weight="700">REJECTED</text>
  <text x="890" y="208" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">Отклонено</text>

  <!-- CANCELLED -->
  <rect x="800" y="260" width="180" height="80" rx="40" fill="rgba(100, 116, 139, 0.15)" stroke="#64748B" stroke-width="2"/>
  <text x="890" y="295" text-anchor="middle" fill="#CBD5E1" font-family="sans-serif" font-size="20" font-weight="700">CANCELLED</text>
  <text x="890" y="318" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">Отменён</text>

  <!-- REVISION_REQUESTED -->
  <rect x="320" y="260" width="180" height="80" rx="40" fill="rgba(245, 158, 11, 0.15)" stroke="#F59E0B" stroke-width="2"/>
  <text x="410" y="295" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="18" font-weight="700">REVISION_REQ</text>
  <text x="410" y="318" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="14">Запрошены правки</text>

  <!-- Arrows: DRAFT → PENDING -->
  <line x1="220" y1="190" x2="318" y2="190" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar1)"/>
  <text x="265" y="180" text-anchor="middle" fill="#67E8F9" font-family="sans-serif" font-size="13" font-weight="600">submit</text>

  <!-- PENDING → APPROVED -->
  <path d="M 500 175 Q 650 100 798 80" stroke="#10B981" stroke-width="2" fill="none" marker-end="url(#ar-green)"/>
  <text x="650" y="120" text-anchor="middle" fill="#6EE7B7" font-family="sans-serif" font-size="13" font-weight="600">approve all</text>

  <!-- PENDING → REJECTED -->
  <line x1="500" y1="190" x2="798" y2="190" stroke="#EF4444" stroke-width="2" marker-end="url(#ar-red)"/>
  <text x="650" y="180" text-anchor="middle" fill="#FCA5A5" font-family="sans-serif" font-size="13" font-weight="600">reject</text>

  <!-- PENDING → REVISION -->
  <path d="M 410 230 Q 410 245 410 258" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#ar-amber)"/>
  <text x="475" y="250" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="13" font-weight="600">request revision</text>

  <!-- REVISION → DRAFT (loop) -->
  <path d="M 320 295 Q 200 290 130 235" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#ar-amber)"/>
  <text x="200" y="285" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="13" font-weight="600">edit + resubmit</text>

  <!-- DRAFT/PENDING → CANCELLED -->
  <path d="M 500 215 Q 650 250 798 295" stroke="#64748B" stroke-width="2" fill="none" marker-end="url(#ar1)" stroke-dasharray="4 3"/>
  <text x="650" y="270" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="13" font-weight="600">cancel (author)</text>
</svg>

---

<!-- _class: section -->

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
    <marker id="ar2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#06B6D4">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <!-- Step 1 -->
  <rect x="40" y="80" width="220" height="120" rx="12" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4" stroke-width="1.5"/>
  <text x="60" y="115" fill="#06B6D4" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="2">ШАГ 1 · APPROVE</text>
  <text x="60" y="148" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="700">Руководитель</text>
  <text x="60" y="174" fill="#94A3B8" font-family="sans-serif" font-size="15">role_key: supervisor</text>
  <text x="60" y="195" fill="#94A3B8" font-family="sans-serif" font-size="15">SLA: 24 ч</text>

  <!-- Arrow -->
  <line x1="265" y1="140" x2="338" y2="140" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar2)"/>

  <!-- Step 2 -->
  <rect x="345" y="80" width="220" height="120" rx="12" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4" stroke-width="1.5"/>
  <text x="365" y="115" fill="#06B6D4" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="2">ШАГ 2 · APPROVE</text>
  <text x="365" y="148" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="700">Бухгалтерия</text>
  <text x="365" y="174" fill="#94A3B8" font-family="sans-serif" font-size="15">group:accounting@company</text>
  <text x="365" y="195" fill="#94A3B8" font-family="sans-serif" font-size="15">SLA: 72 ч</text>

  <!-- Arrow -->
  <line x1="570" y1="140" x2="643" y2="140" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar2)"/>

  <!-- Step 3 -->
  <rect x="650" y="80" width="220" height="120" rx="12" fill="rgba(245, 158, 11, 0.10)" stroke="#F59E0B" stroke-width="1.5"/>
  <text x="670" y="115" fill="#F59E0B" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="2">ШАГ 3 · SIGN ✍</text>
  <text x="670" y="148" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="700">Директор</text>
  <text x="670" y="174" fill="#94A3B8" font-family="sans-serif" font-size="15">company_head</text>
  <text x="670" y="195" fill="#94A3B8" font-family="sans-serif" font-size="15">SLA: 48 ч · подпись</text>

  <!-- Arrow -->
  <line x1="875" y1="140" x2="948" y2="140" stroke="#10B981" stroke-width="2" marker-end="url(#ar2)"/>

  <!-- Final -->
  <rect x="955" y="100" width="120" height="80" rx="40" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" stroke-width="2"/>
  <text x="1015" y="135" text-anchor="middle" fill="#6EE7B7" font-family="sans-serif" font-size="16" font-weight="700">PDF</text>
  <text x="1015" y="158" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="13">в архив</text>

  <!-- Side annotations -->
  <text x="60" y="50" fill="#94A3B8" font-family="sans-serif" font-size="14" font-style="italic">Снепшот цепочки фиксируется на submit'е — задним числом не меняется</text>
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
    <marker id="ar-and" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#06B6D4">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>
  <!-- Start -->
  <rect x="20" y="115" width="100" height="50" rx="8" fill="#1E293B" stroke="#64748B"/>
  <text x="70" y="146" text-anchor="middle" fill="#CBD5E1" font-size="14">Руковод.</text>
  <!-- Split lines -->
  <line x1="125" y1="140" x2="170" y2="60" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-and)"/>
  <line x1="125" y1="140" x2="170" y2="220" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-and)"/>
  <!-- Parallel A -->
  <rect x="175" y="35" width="120" height="50" rx="8" fill="rgba(6, 182, 212, 0.12)" stroke="#06B6D4"/>
  <text x="235" y="66" text-anchor="middle" fill="#67E8F9" font-size="14" font-weight="700">Бухгалтерия</text>
  <!-- Parallel B -->
  <rect x="175" y="195" width="120" height="50" rx="8" fill="rgba(6, 182, 212, 0.12)" stroke="#06B6D4"/>
  <text x="235" y="226" text-anchor="middle" fill="#67E8F9" font-size="14" font-weight="700">Юрист</text>
  <!-- Merge -->
  <line x1="300" y1="60" x2="345" y2="120" stroke="#06B6D4" stroke-width="2"/>
  <line x1="300" y1="220" x2="345" y2="160" stroke="#06B6D4" stroke-width="2"/>
  <!-- End -->
  <rect x="345" y="115" width="100" height="50" rx="8" fill="rgba(16, 185, 129, 0.12)" stroke="#10B981"/>
  <text x="395" y="146" text-anchor="middle" fill="#6EE7B7" font-size="14" font-weight="700">Директор</text>

  <text x="240" y="20" text-anchor="middle" fill="#94A3B8" font-size="12">parallel_group="review", AND</text>
</svg>

<p class="small"><strong>Все</strong> в группе должны одобрить. Любой <code>reject</code> → документ rejected. Удобно когда нужны независимые проверки.</p>

</div>

<div class="card">

<h3>OR-режим</h3>

<svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ar-or" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#3B82F6">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
    <marker id="ar-skip" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#64748B">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>
  <rect x="20" y="115" width="100" height="50" rx="8" fill="#1E293B" stroke="#64748B"/>
  <text x="70" y="146" text-anchor="middle" fill="#CBD5E1" font-size="14">Подача</text>

  <line x1="125" y1="140" x2="170" y2="60" stroke="#3B82F6" stroke-width="2" marker-end="url(#ar-or)"/>
  <line x1="125" y1="140" x2="170" y2="140" stroke="#64748B" stroke-width="2" stroke-dasharray="3 3" marker-end="url(#ar-skip)"/>
  <line x1="125" y1="140" x2="170" y2="220" stroke="#64748B" stroke-width="2" stroke-dasharray="3 3" marker-end="url(#ar-skip)"/>

  <rect x="175" y="35" width="120" height="50" rx="8" fill="rgba(16, 185, 129, 0.12)" stroke="#10B981"/>
  <text x="235" y="58" text-anchor="middle" fill="#6EE7B7" font-size="13" font-weight="700">Дир. №1</text>
  <text x="235" y="76" text-anchor="middle" fill="#10B981" font-size="11">approved ✓</text>

  <rect x="175" y="115" width="120" height="50" rx="8" fill="rgba(100, 116, 139, 0.12)" stroke="#64748B" stroke-dasharray="2 2"/>
  <text x="235" y="138" text-anchor="middle" fill="#94A3B8" font-size="13">Дир. №2</text>
  <text x="235" y="156" text-anchor="middle" fill="#64748B" font-size="11">skipped</text>

  <rect x="175" y="195" width="120" height="50" rx="8" fill="rgba(100, 116, 139, 0.12)" stroke="#64748B" stroke-dasharray="2 2"/>
  <text x="235" y="218" text-anchor="middle" fill="#94A3B8" font-size="13">Дир. №3</text>
  <text x="235" y="236" text-anchor="middle" fill="#64748B" font-size="11">skipped</text>

  <line x1="300" y1="60" x2="345" y2="140" stroke="#3B82F6" stroke-width="2" marker-end="url(#ar-or)"/>
  <rect x="345" y="115" width="100" height="50" rx="8" fill="rgba(16, 185, 129, 0.12)" stroke="#10B981"/>
  <text x="395" y="146" text-anchor="middle" fill="#6EE7B7" font-size="14" font-weight="700">Готово</text>

  <text x="240" y="20" text-anchor="middle" fill="#94A3B8" font-size="12">parallel_group="any", OR</text>
</svg>

<p class="small"><strong>Любой один</strong> approve → остальные в SKIPPED, идём дальше. Reject не блокирует. Удобно для дублирующих ролей.</p>

</div>

</div>

---

## Резолверы — формулы вместо имён

<svg viewBox="0 0 1100 380" xmlns="http://www.w3.org/2000/svg">
  <!-- Tree -->
  <rect x="40" y="40" width="280" height="60" rx="8" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="60" y="65" fill="#06B6D4" font-size="11" font-weight="700" letter-spacing="2">DEPTH 1 · MANAGEMENT</text>
  <text x="60" y="88" fill="#F8FAFC" font-size="18" font-weight="700">Управляющий ГК</text>

  <line x1="180" y1="100" x2="180" y2="118" stroke="#475569" stroke-width="2"/>

  <rect x="40" y="120" width="280" height="60" rx="8" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="60" y="145" fill="#06B6D4" font-size="11" font-weight="700" letter-spacing="2">DEPTH 2 · DIVISION</text>
  <text x="60" y="168" fill="#F8FAFC" font-size="18" font-weight="700">Технический директор</text>

  <line x1="180" y1="180" x2="180" y2="198" stroke="#475569" stroke-width="2"/>

  <rect x="40" y="200" width="280" height="60" rx="8" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="60" y="225" fill="#06B6D4" font-size="11" font-weight="700" letter-spacing="2">DEPTH 3 · SERVICE</text>
  <text x="60" y="248" fill="#F8FAFC" font-size="18" font-weight="700">Служба РЗА</text>

  <line x1="180" y1="260" x2="180" y2="278" stroke="#475569" stroke-width="2"/>

  <rect x="40" y="280" width="280" height="60" rx="8" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="60" y="305" fill="#06B6D4" font-size="11" font-weight="700" letter-spacing="2">DEPTH 4 · DEPARTMENT</text>
  <text x="60" y="328" fill="#F8FAFC" font-size="18" font-weight="700">Отдел РЗА 1 ← автор тут</text>

  <!-- Resolver column -->
  <text x="380" y="80" fill="#67E8F9" font-size="14" font-weight="700" letter-spacing="2">FORMULA</text>
  <rect x="380" y="100" width="350" height="50" rx="8" fill="#1E293B" stroke="#475569"/>
  <text x="395" y="123" fill="#67E8F9" font-size="14" font-family="JetBrains Mono">supervisor</text>
  <text x="395" y="142" fill="#94A3B8" font-size="12">→ head моего отдела</text>

  <rect x="380" y="160" width="350" height="50" rx="8" fill="#1E293B" stroke="#475569"/>
  <text x="395" y="183" fill="#67E8F9" font-size="14" font-family="JetBrains Mono">dept_head_type:service</text>
  <text x="395" y="202" fill="#94A3B8" font-size="12">→ head ближайшей службы вверх</text>

  <rect x="380" y="220" width="350" height="50" rx="8" fill="#1E293B" stroke="#475569"/>
  <text x="395" y="243" fill="#67E8F9" font-size="14" font-family="JetBrains Mono">dept_head_type:division</text>
  <text x="395" y="262" fill="#94A3B8" font-size="12">→ head ближайшей дирекции вверх</text>

  <rect x="380" y="280" width="350" height="50" rx="8" fill="#1E293B" stroke="#475569"/>
  <text x="395" y="303" fill="#67E8F9" font-size="14" font-family="JetBrains Mono">company_head</text>
  <text x="395" y="322" fill="#94A3B8" font-size="12">→ верхушка компании</text>

  <!-- Resolution column -->
  <text x="780" y="80" fill="#6EE7B7" font-size="14" font-weight="700" letter-spacing="2">RESOLVES TO</text>
  <rect x="780" y="100" width="280" height="50" rx="8" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="800" y="125" fill="#F8FAFC" font-size="16" font-weight="600">Бычков Ю. В.</text>
  <text x="800" y="143" fill="#94A3B8" font-size="12">head «Отдел РЗА 1»</text>

  <rect x="780" y="160" width="280" height="50" rx="8" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="800" y="185" fill="#F8FAFC" font-size="16" font-weight="600">Сидоров С. С.</text>
  <text x="800" y="203" fill="#94A3B8" font-size="12">head «Служба РЗА»</text>

  <rect x="780" y="220" width="280" height="50" rx="8" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="800" y="245" fill="#F8FAFC" font-size="16" font-weight="600">Петров П. П.</text>
  <text x="800" y="263" fill="#94A3B8" font-size="12">head «Технический директор»</text>

  <rect x="780" y="280" width="280" height="50" rx="8" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="800" y="305" fill="#F8FAFC" font-size="16" font-weight="600">Ефимов М. Н.</text>
  <text x="800" y="323" fill="#94A3B8" font-size="12">head «Управляющий ГК»</text>
</svg>

<p class="small center muted">11 формул — supervisor, dept_head_type:*, company_head, group:*, fixed_user:N, field_user:*, author и др.<br>Цепочка остаётся валидной даже после кадровых перестановок.</p>

---

<!-- _class: section -->

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
    <marker id="ar-flow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#06B6D4">
      <path d="M0,0 L0,6 L9,3 z"/>
    </marker>
  </defs>

  <!-- Step 1: System -->
  <circle cx="120" cy="80" r="40" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" stroke-width="2"/>
  <text x="120" y="86" text-anchor="middle" fill="#67E8F9" font-size="22" font-weight="700">1</text>
  <text x="120" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Шаг активирован</text>
  <text x="120" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">Система генерирует</text>
  <text x="120" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">подписанный токен (TTL 14d)</text>

  <line x1="170" y1="80" x2="248" y2="80" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-flow)"/>

  <!-- Step 2: Email -->
  <circle cx="290" cy="80" r="40" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" stroke-width="2"/>
  <text x="290" y="86" text-anchor="middle" fill="#67E8F9" font-size="22" font-weight="700">2</text>
  <text x="290" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Email согласующему</text>
  <text x="290" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">с двумя ссылками:</text>
  <text x="290" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">Approve / Reject</text>

  <line x1="340" y1="80" x2="418" y2="80" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-flow)"/>

  <!-- Step 3: Click -->
  <circle cx="460" cy="80" r="40" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" stroke-width="2"/>
  <text x="460" y="86" text-anchor="middle" fill="#67E8F9" font-size="22" font-weight="700">3</text>
  <text x="460" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Клик по ссылке</text>
  <text x="460" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">Открывается публичная</text>
  <text x="460" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">страница (без логина)</text>

  <line x1="510" y1="80" x2="588" y2="80" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-flow)"/>

  <!-- Step 4: Verify -->
  <circle cx="630" cy="80" r="40" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" stroke-width="2"/>
  <text x="630" y="86" text-anchor="middle" fill="#67E8F9" font-size="22" font-weight="700">4</text>
  <text x="630" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Проверка токена</text>
  <text x="630" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">Подпись валидна?</text>
  <text x="630" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">Шаг ещё открыт?</text>

  <line x1="680" y1="80" x2="758" y2="80" stroke="#06B6D4" stroke-width="2" marker-end="url(#ar-flow)"/>

  <!-- Step 5: Action -->
  <circle cx="800" cy="80" r="40" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" stroke-width="2"/>
  <text x="800" y="86" text-anchor="middle" fill="#6EE7B7" font-size="22" font-weight="700">5</text>
  <text x="800" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Action выполнен</text>
  <text x="800" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">Approve/reject</text>
  <text x="800" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">через service-layer</text>

  <line x1="850" y1="80" x2="928" y2="80" stroke="#10B981" stroke-width="2" marker-end="url(#ar-flow)"/>

  <!-- Step 6: PDF -->
  <circle cx="970" cy="80" r="40" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" stroke-width="2"/>
  <text x="970" y="86" text-anchor="middle" fill="#6EE7B7" font-size="22" font-weight="700">6</text>
  <text x="970" y="145" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Цепочка движется</text>
  <text x="970" y="165" text-anchor="middle" fill="#94A3B8" font-size="13">Следующий шаг или</text>
  <text x="970" y="183" text-anchor="middle" fill="#94A3B8" font-size="13">PDF в архив</text>

  <!-- Phone -->
  <rect x="380" y="240" width="340" height="100" rx="14" fill="#1E293B" stroke="#06B6D4" stroke-width="1"/>
  <text x="400" y="270" fill="#67E8F9" font-size="12" font-weight="700" letter-spacing="2">📱 МОБИЛЬНЫЙ EMAIL</text>
  <text x="400" y="295" fill="#F8FAFC" font-size="16" font-weight="700">Bresler ERP: на согласование</text>
  <rect x="400" y="305" width="140" height="26" rx="13" fill="rgba(16, 185, 129, 0.2)" stroke="#10B981"/>
  <text x="470" y="322" text-anchor="middle" fill="#6EE7B7" font-size="13" font-weight="700">✓ Согласовать</text>
  <rect x="555" y="305" width="120" height="26" rx="13" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444"/>
  <text x="615" y="322" text-anchor="middle" fill="#FCA5A5" font-size="13" font-weight="700">✗ Отклонить</text>
</svg>

<p class="small center"><strong>Логин не нужен.</strong> Авторизация по подписанному токену.<br>Ссылка одноразовая · TTL 14 дней · защищена от подмены подписью SECRET_KEY.</p>

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

<p class="small">⚠ Уже PENDING-шаги не перерезолвятся — это by design: по ним кнопка «Делегировать» в UI.</p>

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

<p class="small">Один шаг помечается просроченным один раз — без спама в bell.</p>

</div>

</div>

---

## Anatomy PDF-документа

<svg viewBox="0 0 1100 480" xmlns="http://www.w3.org/2000/svg">
  <!-- Page -->
  <rect x="350" y="20" width="400" height="440" rx="6" fill="#FAFAFA" stroke="#CBD5E1" stroke-width="1.5"/>

  <!-- Header company -->
  <rect x="370" y="40" width="200" height="70" fill="#F1F5F9" rx="4"/>
  <text x="380" y="62" fill="#0F172A" font-size="11" font-weight="700">НПП БРЕСЛЕР</text>
  <text x="380" y="80" fill="#475569" font-size="10">Управляющий ГК</text>
  <text x="380" y="95" fill="#475569" font-size="10">Ефимов М. Н.</text>

  <!-- To -->
  <rect x="585" y="40" width="145" height="70" fill="#F1F5F9" rx="4"/>
  <text x="595" y="62" fill="#0F172A" font-size="11" font-weight="700">КОМУ:</text>
  <text x="595" y="80" fill="#475569" font-size="10">Бухгалтерии</text>
  <text x="595" y="95" fill="#475569" font-size="10">НПП БРЕСЛЕР</text>

  <!-- Title -->
  <text x="550" y="140" text-anchor="middle" fill="#0F172A" font-size="14" font-weight="700">Смета на командировку</text>
  <line x1="450" y1="148" x2="650" y2="148" stroke="#06B6D4" stroke-width="1"/>

  <!-- Number -->
  <text x="550" y="170" text-anchor="middle" fill="#475569" font-size="9">№ КОМАНД-СМЕТА-2026-0042 от 26.04.2026</text>

  <!-- Body -->
  <rect x="370" y="190" width="360" height="180" fill="#FFFFFF" stroke="#E2E8F0" rx="4"/>
  <text x="380" y="210" fill="#0F172A" font-size="9">Прошу утвердить смету расходов на</text>
  <text x="380" y="222" fill="#0F172A" font-size="9">служебную командировку.</text>
  <text x="380" y="244" fill="#0F172A" font-size="9">Город: Санкт-Петербург</text>
  <text x="380" y="256" fill="#0F172A" font-size="9">Период: 01.06.2026 — 05.06.2026</text>
  <text x="380" y="278" fill="#0F172A" font-size="9" font-weight="700">Расходы:</text>
  <text x="380" y="292" fill="#475569" font-size="9">  Транспорт:    8 500 ₽</text>
  <text x="380" y="304" fill="#475569" font-size="9">  Проживание: 12 000 ₽</text>
  <text x="380" y="316" fill="#475569" font-size="9">  Суточные:     4 900 ₽</text>
  <text x="380" y="334" fill="#0F172A" font-size="10" font-weight="700">  ИТОГО:    25 400 ₽</text>

  <!-- Signature -->
  <text x="380" y="395" fill="#475569" font-size="9">26.04.2026</text>
  <line x1="540" y1="405" x2="720" y2="405" stroke="#0F172A"/>
  <path d="M 555 392 Q 580 380 605 395 T 660 388" stroke="#1E40AF" stroke-width="1.5" fill="none"/>
  <text x="630" y="425" text-anchor="middle" fill="#0F172A" font-size="9" font-weight="700">Терентьев А. Ю.</text>

  <!-- Annotations -->
  <line x1="120" y1="75" x2="370" y2="75" stroke="#06B6D4" stroke-dasharray="3 3"/>
  <rect x="20" y="55" width="260" height="40" rx="6" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="30" y="75" fill="#67E8F9" font-size="11" font-weight="700">ШАПКА КОМПАНИИ</text>
  <text x="30" y="90" fill="#94A3B8" font-size="11">из справочника OrgUnitHead</text>

  <line x1="280" y1="270" x2="370" y2="270" stroke="#06B6D4" stroke-dasharray="3 3"/>
  <rect x="20" y="250" width="260" height="40" rx="6" fill="rgba(6, 182, 212, 0.10)" stroke="#06B6D4"/>
  <text x="30" y="270" fill="#67E8F9" font-size="11" font-weight="700">ОТРЕНДЕРЕННОЕ ТЕЛО</text>
  <text x="30" y="285" fill="#94A3B8" font-size="11">DTL-шаблон + значения полей</text>

  <line x1="280" y1="395" x2="540" y2="395" stroke="#06B6D4" stroke-dasharray="3 3"/>
  <rect x="20" y="375" width="260" height="40" rx="6" fill="rgba(245, 158, 11, 0.10)" stroke="#F59E0B"/>
  <text x="30" y="395" fill="#FCD34D" font-size="11" font-weight="700">CANVAS-ПОДПИСЬ</text>
  <text x="30" y="410" fill="#94A3B8" font-size="11">data:image/png из шага</text>

  <line x1="780" y1="225" x2="850" y2="225" stroke="#06B6D4" stroke-dasharray="3 3"/>
  <rect x="850" y="205" width="240" height="40" rx="6" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="860" y="225" fill="#6EE7B7" font-size="11" font-weight="700">КЕШ 7 ДНЕЙ</text>
  <text x="860" y="240" fill="#94A3B8" font-size="11">регенерация при изменениях</text>

  <line x1="780" y1="320" x2="850" y2="320" stroke="#06B6D4" stroke-dasharray="3 3"/>
  <rect x="850" y="300" width="240" height="40" rx="6" fill="rgba(16, 185, 129, 0.10)" stroke="#10B981"/>
  <text x="860" y="320" fill="#6EE7B7" font-size="11" font-weight="700">ZIP-АРХИВ</text>
  <text x="860" y="335" fill="#94A3B8" font-size="11">все документы за период</text>
</svg>

---

<!-- _class: section -->

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
<li>14 типов полей: text, money, choice, user, table…</li>
<li>Conditional блоки (choices, columns)</li>
<li>Reorder ↑/↓</li>
<li>Validation на сохранении</li>
</ul>

</div>

<div class="card">

<h3>📐 Шаблоны</h3>

<p>Django Template Language для тела и заголовка:</p>
<ul>
<li>Доступен <code>author</code>, <code>today</code>, поля по имени</li>
<li><code>fields</code> — гидрированные значения</li>
<li>Auto-escape, безопасно по умолчанию</li>
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
<li>Inform-шаги (auto-complete)</li>
</ul>

</div>

<div class="card">

<h3>🎯 Параметры</h3>

<p>Per-type настройки:</p>
<ul>
<li>Visibility (personal / dept / public)</li>
<li>Multi-tenant override</li>
<li>Кто может создавать</li>
<li>Требует ли подпись canvas</li>
</ul>

</div>

</div>

---

## Отчёты и bulk-операции

<div class="grid-3">

<div class="card">
<div class="icon">⏱</div>
<h3>Висящие документы</h3>
<p>Pending дольше N дней. Чекбокс → массово напомнить или отменить с reason.</p>
<span class="pill pill-amber">Bulk Actions</span>
</div>

<div class="card">
<div class="icon">⚠️</div>
<h3>Нарушения SLA</h3>
<p>Шаги с зафиксированным sla_breached_at. Эскалация на руководителя.</p>
<span class="pill pill-amber">Auto-escalation</span>
</div>

<div class="card">
<div class="icon">📊</div>
<h3>Топ типов</h3>
<p>Гистограмма за 30 дней: total / approved / rejected / pending.</p>
<span class="pill pill-cyan">Analytics</span>
</div>

<div class="card">
<div class="icon">📦</div>
<h3>ZIP-архив</h3>
<p>Все документы за период. Index + PDF + вложения. Header X-Archive-Summary со статистикой.</p>
<span class="pill pill-emerald">Audit-ready</span>
</div>

<div class="card">
<div class="icon">🩺</div>
<h3>Diagnostic command</h3>
<p><code>edo_explain_visibility</code> — почему документ не виден конкретному пользователю.</p>
<span class="pill pill-blue">DevOps</span>
</div>

<div class="card">
<div class="icon">📜</div>
<h3>Шапки организаций</h3>
<p>Справочник директоров с историей по датам. Подставляется в PDF на момент submit.</p>
<span class="pill pill-cyan">Snapshot</span>
</div>

</div>

---

## Audit и снепшоты

<svg viewBox="0 0 1100 320" xmlns="http://www.w3.org/2000/svg">
  <!-- Document submission moment -->
  <rect x="40" y="40" width="280" height="240" rx="14" fill="rgba(6, 182, 212, 0.08)" stroke="#06B6D4" stroke-width="1.5"/>
  <text x="60" y="75" fill="#06B6D4" font-size="13" font-weight="700" letter-spacing="2">МОМЕНТ SUBMIT</text>
  <text x="60" y="105" fill="#F8FAFC" font-size="20" font-weight="700">Снепшоты в БД</text>

  <text x="60" y="145" fill="#67E8F9" font-size="14" font-weight="600">chain_snapshot</text>
  <text x="60" y="163" fill="#94A3B8" font-size="13">JSON цепочки на момент</text>

  <text x="60" y="195" fill="#67E8F9" font-size="14" font-weight="600">body_rendered</text>
  <text x="60" y="213" fill="#94A3B8" font-size="13">Отрендеренный текст</text>

  <text x="60" y="245" fill="#67E8F9" font-size="14" font-weight="600">header_snapshot</text>
  <text x="60" y="263" fill="#94A3B8" font-size="13">Компания + директор</text>

  <!-- Timeline -->
  <text x="490" y="70" fill="#94A3B8" font-size="14" font-weight="600">Что бы ни случилось дальше:</text>

  <rect x="370" y="90" width="280" height="50" rx="6" fill="rgba(245, 158, 11, 0.08)" stroke="#F59E0B"/>
  <text x="385" y="115" fill="#FCD34D" font-size="14" font-weight="700">Админ изменил тип документа</text>
  <text x="385" y="132" fill="#94A3B8" font-size="12">Старые документы остаются с оригиналом</text>

  <rect x="370" y="155" width="280" height="50" rx="6" fill="rgba(245, 158, 11, 0.08)" stroke="#F59E0B"/>
  <text x="385" y="180" fill="#FCD34D" font-size="14" font-weight="700">Сменился директор компании</text>
  <text x="385" y="197" fill="#94A3B8" font-size="12">PDF-архив сохраняет старого в шапке</text>

  <rect x="370" y="220" width="280" height="50" rx="6" fill="rgba(245, 158, 11, 0.08)" stroke="#F59E0B"/>
  <text x="385" y="245" fill="#FCD34D" font-size="14" font-weight="700">Кадровая реорганизация</text>
  <text x="385" y="262" fill="#94A3B8" font-size="12">История кто что одобрил — нерушима</text>

  <!-- Result -->
  <rect x="700" y="40" width="360" height="240" rx="14" fill="rgba(16, 185, 129, 0.08)" stroke="#10B981" stroke-width="1.5"/>
  <text x="720" y="75" fill="#10B981" font-size="13" font-weight="700" letter-spacing="2">РЕЗУЛЬТАТ</text>
  <text x="720" y="105" fill="#F8FAFC" font-size="20" font-weight="700">Audit-grade архив</text>

  <text x="720" y="142" fill="#6EE7B7" font-size="14">✓ Каждое решение фиксировано</text>
  <text x="720" y="166" fill="#6EE7B7" font-size="14">✓ Кто, когда, какой комментарий</text>
  <text x="720" y="190" fill="#6EE7B7" font-size="14">✓ simple_history на всех моделях</text>
  <text x="720" y="214" fill="#6EE7B7" font-size="14">✓ original_approver при делегировании</text>
  <text x="720" y="238" fill="#6EE7B7" font-size="14">✓ PDF-копия с подписями</text>
  <text x="720" y="262" fill="#6EE7B7" font-size="14">✓ Защита от ретроактивных правок</text>
</svg>

---

<!-- _class: section -->

<div class="num">05</div>

# Зрелость и сравнение

<div class="lead">
Где мы относительно DIRECTUM, Tezis, 1C:ДО.
И почему делали сами, а не покупали.
</div>

---

## Сравнение с рыночными СЭДО

<table>
<thead>
<tr>
<th>Возможность</th>
<th>DIRECTUM / Tezis</th>
<th>1С:ДО</th>
<th><span class="pill pill-cyan">Bresler ЭДО</span></th>
</tr>
</thead>
<tbody>
<tr>
<td>Типизированные формы</td>
<td>✅</td>
<td>✅</td>
<td>✅</td>
</tr>
<tr>
<td>Параллельные ветки AND/OR</td>
<td>✅</td>
<td>✅</td>
<td>✅</td>
</tr>
<tr>
<td>Email-link approve</td>
<td>✅</td>
<td>✅</td>
<td>✅</td>
</tr>
<tr>
<td>Замещения по графику</td>
<td>✅</td>
<td>✅</td>
<td>✅</td>
</tr>
<tr>
<td>Конструктор типов через UI</td>
<td>BPMN-style сложный</td>
<td>Через 1С-конфигурацию</td>
<td>✅ Простой визуальный</td>
</tr>
<tr>
<td>КЭП через Диадок/СБИС</td>
<td>✅ нативно</td>
<td>✅</td>
<td>❌ В roadmap (Q3 2026)</td>
</tr>
<tr>
<td>Интеграция с ERP / 1С</td>
<td>Внешняя шина</td>
<td>✅ часть платформы</td>
<td>✅ Один стек, общие модели</td>
</tr>
<tr>
<td>Полный контроль кода</td>
<td>❌ vendor lock-in</td>
<td>❌ vendor lock-in</td>
<td>✅ <strong>наша разработка</strong></td>
</tr>
<tr>
<td>Стоимость лицензии</td>
<td>от 100 000 ₽ /юзер</td>
<td>от 5 000 ₽ /юзер</td>
<td><strong>0 ₽</strong></td>
</tr>
</tbody>
</table>

<p class="small center"><strong>Закрываем 90% потребностей</strong> при нулевой лицензионной стоимости и полном контроле.</p>

---

## Roadmap (Фаза 5+)

<svg viewBox="0 0 1100 360" xmlns="http://www.w3.org/2000/svg">
  <!-- Timeline line -->
  <line x1="80" y1="180" x2="1020" y2="180" stroke="#334155" stroke-width="3"/>

  <!-- Done sections -->
  <rect x="80" y="172" width="240" height="16" fill="#10B981" rx="4"/>
  <text x="200" y="158" text-anchor="middle" fill="#6EE7B7" font-size="13" font-weight="700">Фазы 1–4 · Готово</text>
  <text x="200" y="220" text-anchor="middle" fill="#94A3B8" font-size="12">9 типов · цепочки · admin</text>
  <text x="200" y="236" text-anchor="middle" fill="#94A3B8" font-size="12">отчёты · ZIP · email-link</text>

  <!-- Phase 5 markers -->
  <circle cx="430" cy="180" r="14" fill="#06B6D4" stroke="#67E8F9" stroke-width="2"/>
  <text x="430" y="186" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">5</text>
  <text x="430" y="120" text-anchor="middle" fill="#67E8F9" font-size="13" font-weight="700">Q3 2026</text>
  <text x="430" y="138" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">КЭП</text>
  <text x="430" y="240" text-anchor="middle" fill="#94A3B8" font-size="12">Диадок / СБИС / КриптоПро</text>
  <text x="430" y="256" text-anchor="middle" fill="#94A3B8" font-size="12">для внешних документов</text>

  <circle cx="580" cy="180" r="14" fill="#06B6D4" stroke="#67E8F9" stroke-width="2"/>
  <text x="580" y="186" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">6</text>
  <text x="580" y="120" text-anchor="middle" fill="#67E8F9" font-size="13" font-weight="700">Q4 2026</text>
  <text x="580" y="138" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">1С:Бухгалтерия</text>
  <text x="580" y="240" text-anchor="middle" fill="#94A3B8" font-size="12">выгрузка смет и премий</text>
  <text x="580" y="256" text-anchor="middle" fill="#94A3B8" font-size="12">в проводки автоматически</text>

  <circle cx="730" cy="180" r="14" fill="#3B82F6" stroke="#93C5FD" stroke-width="2"/>
  <text x="730" y="186" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">7</text>
  <text x="730" y="120" text-anchor="middle" fill="#93C5FD" font-size="13" font-weight="700">Q1 2027</text>
  <text x="730" y="138" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">Mobile PWA</text>
  <text x="730" y="240" text-anchor="middle" fill="#94A3B8" font-size="12">работа с телефона</text>
  <text x="730" y="256" text-anchor="middle" fill="#94A3B8" font-size="12">push-уведомления</text>

  <circle cx="880" cy="180" r="14" fill="#475569" stroke="#94A3B8" stroke-width="2"/>
  <text x="880" y="186" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">8</text>
  <text x="880" y="120" text-anchor="middle" fill="#94A3B8" font-size="13" font-weight="700">Позже</text>
  <text x="880" y="138" text-anchor="middle" fill="#F8FAFC" font-size="16" font-weight="700">OCR + BI</text>
  <text x="880" y="240" text-anchor="middle" fill="#94A3B8" font-size="12">распознавание сканов</text>
  <text x="880" y="256" text-anchor="middle" fill="#94A3B8" font-size="12">аналитика согласований</text>
</svg>

<p class="small center muted">Roadmap гибкий — приоритеты определяются запросами бизнеса. Фазы 1-4 уже в production.</p>

---

<!-- _class: title -->

# Спасибо

<div class="tagline">

**Bresler ERP · ЭДО** — модуль готов к ежедневной работе.

</div>

<div style="margin-top: 60px;">

📂 **Документация:** `docs/edo_user_guide.md` · `docs/edo_admin_guide.md`
🧪 **Тест-сценарии:** `docs/edo_test_scenarios.md` (50+ кейсов)
📧 **Контакт:** ds9554@chebnet.com

</div>

<div class="meta">

Вопросы и обсуждение

</div>
