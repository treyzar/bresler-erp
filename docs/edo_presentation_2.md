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

  /* ============== RESOLVERS-режим: 2-колонки ============== */
  section.resolvers { padding: 40px 60px; }
  section.resolvers h2 { font-size: 28px; margin-bottom: 0.4em; padding-bottom: 12px; }
  .resolvers-grid {
    display: grid;
    grid-template-columns: 0.85fr 1.15fr;
    gap: 20px;
    margin-top: 8px;
  }
  .res-tree, .res-formulas {
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 12px;
    padding: 18px 20px;
  }
  .res-head {
    color: #7C7C84;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 14px;
  }
  .res-node {
    background: #1A1A1F;
    border: 1px solid #36363F;
    border-radius: 8px;
    padding: 8px 12px;
    margin: 0;
  }
  .res-node.author {
    border-color: #E73F0C;
    background: linear-gradient(90deg, rgba(231, 63, 12, 0.08) 0%, #1A1A1F 100%);
  }
  .res-tag {
    color: #7C7C84;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }
  .res-name {
    color: #F4F4F6;
    font-size: 14px;
    font-weight: 500;
  }
  .res-arrow {
    color: #5C5C66;
    font-size: 14px;
    text-align: center;
    line-height: 1;
    padding: 2px 0;
  }
  .res-row {
    display: grid;
    grid-template-columns: 1.1fr auto 1fr;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    background: #1A1A1F;
    border: 1px solid #36363F;
    border-radius: 8px;
    margin-bottom: 6px;
  }
  .res-row code {
    background: transparent;
    border: none;
    color: #DEDEE2;
    font-size: 13px;
    padding: 0;
  }
  .res-arrow-h {
    color: #E73F0C;
    font-weight: 700;
    text-align: center;
  }
  .res-person {
    color: #F4F4F6;
    font-size: 13px;
    font-weight: 600;
  }
  .res-summary {
    margin-top: 14px;
    padding: 12px 14px;
    background: rgba(231, 63, 12, 0.06);
    border-left: 2px solid #E73F0C;
    border-radius: 0 8px 8px 0;
    color: #B8B8C0;
    font-size: 13px;
    line-height: 1.5;
  }

  /* ============== ANATOMY-режим: PDF-mockup + аннотации ============== */
  section.anatomy { padding: 40px 60px; }
  section.anatomy h2 { font-size: 28px; margin-bottom: 0.4em; padding-bottom: 12px; }
  .anatomy-grid {
    display: grid;
    grid-template-columns: 0.85fr 1.15fr;
    gap: 24px;
    margin-top: 8px;
    align-items: start;
  }
  /* Бумажный документ — светлый блок на тёмном фоне */
  .anatomy-doc {
    background: #F8F8F0;
    color: #18181B;
    border-radius: 6px;
    padding: 18px 20px;
    font-family: "Times New Roman", Georgia, serif;
    font-size: 12px;
    line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    position: relative;
  }
  .doc-headline {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  .doc-from, .doc-to {
    background: #EFEFE8;
    padding: 8px 10px;
    border-radius: 3px;
    flex: 1;
    font-size: 10px;
  }
  .doc-company { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
  .doc-tag { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
  .doc-line { color: #4B5563; font-size: 10px; }
  .doc-title {
    text-align: center;
    font-weight: 700;
    font-size: 14px;
    margin: 8px 0 4px;
    color: #18181B;
  }
  .doc-num {
    text-align: center;
    font-size: 9px;
    color: #71717A;
    margin-bottom: 12px;
    border-bottom: 1px solid #D4D4D8;
    padding-bottom: 8px;
  }
  .doc-body { font-size: 11px; color: #1F1F23; }
  .doc-body > div { margin: 4px 0; }
  .doc-row { margin: 6px 0; }
  .doc-bold { font-weight: 700; margin-top: 8px; }
  .doc-list {
    margin: 4px 0;
    padding-left: 12px;
  }
  .doc-list > div {
    display: flex;
    justify-content: space-between;
    color: #4B5563;
    margin: 2px 0;
  }
  .doc-list .doc-total {
    color: #18181B;
    border-top: 1px solid #D4D4D8;
    padding-top: 4px;
    margin-top: 4px;
  }
  .doc-sign {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 18px;
    font-size: 10px;
  }
  .doc-sign-date { color: #4B5563; }
  .doc-sign-block { text-align: center; min-width: 140px; }
  .doc-sign-curve {
    font-size: 16px;
    color: #1E3A8A;
    font-style: italic;
    margin-bottom: -4px;
    transform: rotate(-2deg);
    display: inline-block;
  }
  .doc-sign-line {
    border-bottom: 1px solid #18181B;
    margin: 2px 0 4px;
  }
  .doc-sign-name { font-weight: 700; font-size: 10px; }

  /* Правая колонка с аннотациями */
  .anatomy-notes {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .anote {
    display: grid;
    grid-template-columns: 6px 1fr;
    gap: 14px;
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 8px;
    padding: 10px 14px;
    align-items: stretch;
  }
  .anote-marker {
    background: #E73F0C;
    border-radius: 3px;
    width: 4px;
  }
  .anote-title {
    color: #F4F4F6;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  }
  .anote-desc {
    color: #A8A8B0;
    font-size: 12px;
    line-height: 1.4;
  }
  .anote-desc code {
    background: #1A1A1F;
    border: 1px solid #36363F;
    color: #DEDEE2;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }

  /* ============== AUDIT-режим ============== */
  section.audit { padding: 40px 60px; }
  section.audit h2 { font-size: 28px; margin-bottom: 0.4em; padding-bottom: 12px; }
  .audit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1.1fr;
    gap: 16px;
    margin-top: 8px;
    align-items: stretch;
  }
  .audit-col {
    background: #232329;
    border: 1px solid #2E2E36;
    border-radius: 12px;
    padding: 16px 18px;
  }
  .audit-result {
    background: linear-gradient(180deg, rgba(231, 63, 12, 0.06) 0%, #232329 100%);
    border-color: rgba(231, 63, 12, 0.4);
  }
  .audit-head {
    color: #7C7C84;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }
  .audit-head.accent { color: #E73F0C; }
  .audit-title {
    color: #F4F4F6;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 14px;
  }
  .audit-item {
    background: #1A1A1F;
    border: 1px solid #36363F;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .audit-item code {
    background: transparent;
    border: none;
    padding: 0;
    color: #DEDEE2;
    font-size: 13px;
    font-weight: 600;
  }
  .audit-item span {
    color: #9090A0;
    font-size: 12px;
    line-height: 1.3;
  }
  .audit-row {
    background: #1A1A1F;
    border: 1px solid #36363F;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }
  .audit-row-title {
    color: #F4F4F6;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .audit-row-desc {
    color: #9090A0;
    font-size: 12px;
    line-height: 1.3;
  }
  .audit-checks {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .audit-checks li {
    color: #DEDEE2;
    font-size: 13px;
    padding: 5px 0 5px 22px;
    position: relative;
    line-height: 1.4;
  }
  .audit-checks li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #6EE7B7;
    font-weight: 700;
  }
  .audit-checks li code {
    background: #1A1A1F;
    border: 1px solid #36363F;
    color: #DEDEE2;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
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

<!-- _class: resolvers -->

## Резолверы — формулы вместо имён

<div class="resolvers-grid">

<div class="res-tree">

<div class="res-head">ДЕРЕВО ПОДРАЗДЕЛЕНИЙ</div>

<div class="res-node">
  <div class="res-tag">depth 1 · management</div>
  <div class="res-name">Управляющий ГК</div>
</div>
<div class="res-arrow">↓</div>
<div class="res-node">
  <div class="res-tag">depth 2 · division</div>
  <div class="res-name">Технический директор</div>
</div>
<div class="res-arrow">↓</div>
<div class="res-node">
  <div class="res-tag">depth 3 · service</div>
  <div class="res-name">Служба РЗА</div>
</div>
<div class="res-arrow">↓</div>
<div class="res-node author">
  <div class="res-tag">depth 4 · department</div>
  <div class="res-name">Отдел РЗА 1 — автор</div>
</div>

</div>

<div class="res-formulas">

<div class="res-head">FORMULA → ВЫБРАННЫЙ ЧЕЛОВЕК</div>

<div class="res-row">
  <code>supervisor</code>
  <span class="res-arrow-h">→</span>
  <span class="res-person">Бычков Ю. В.</span>
</div>
<div class="res-row">
  <code>dept_head_type:service</code>
  <span class="res-arrow-h">→</span>
  <span class="res-person">Сидоров С. С.</span>
</div>
<div class="res-row">
  <code>dept_head_type:division</code>
  <span class="res-arrow-h">→</span>
  <span class="res-person">Петров П. П.</span>
</div>
<div class="res-row">
  <code>company_head</code>
  <span class="res-arrow-h">→</span>
  <span class="res-person">Ефимов М. Н.</span>
</div>

<div class="res-summary">
  <strong>11 резолверов</strong> — supervisor, dept_head_type, company_head,
  group, fixed_user, field_user_supervisor, author и др.
  Цепочка остаётся валидной даже после кадровых перестановок.
</div>

</div>

</div>

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

<!-- _class: anatomy -->

## Anatomy PDF-документа

<div class="anatomy-grid">

<!-- ===== Левая колонка: «бумажный» макет PDF ===== -->
<div class="anatomy-doc">
  <div class="doc-headline">
    <div class="doc-from">
      <div class="doc-company">НПП БРЕСЛЕР</div>
      <div class="doc-line">Управляющий ГК</div>
      <div class="doc-line">Ефимов М. Н.</div>
    </div>
    <div class="doc-to">
      <div class="doc-tag">Кому:</div>
      <div class="doc-line">Бухгалтерии</div>
      <div class="doc-line">НПП БРЕСЛЕР</div>
    </div>
  </div>

  <div class="doc-title">Смета на командировку</div>
  <div class="doc-num">№ КОМАНД-СМЕТА-2026-0042 от 26.04.2026</div>

  <div class="doc-body">
    <div>Прошу утвердить смету расходов на служебную командировку.</div>
    <div class="doc-row"><b>Город:</b> Санкт-Петербург</div>
    <div class="doc-row"><b>Период:</b> 01.06.2026 — 05.06.2026</div>
    <div class="doc-row doc-bold">Расходы:</div>
    <div class="doc-list">
      <div>Транспорт<span>8 500 ₽</span></div>
      <div>Проживание<span>12 000 ₽</span></div>
      <div>Суточные<span>4 900 ₽</span></div>
      <div class="doc-total"><b>ИТОГО</b><span><b>25 400 ₽</b></span></div>
    </div>
  </div>

  <div class="doc-sign">
    <div class="doc-sign-date">26.04.2026</div>
    <div class="doc-sign-block">
      <div class="doc-sign-curve">𝓣𝓮𝓻𝓮𝓷𝓽𝓲𝓮𝓿</div>
      <div class="doc-sign-line"></div>
      <div class="doc-sign-name">Терентьев А. Ю.</div>
    </div>
  </div>
</div>

<!-- ===== Правая колонка: аннотации ===== -->
<div class="anatomy-notes">
  <div class="anote">
    <div class="anote-marker"></div>
    <div>
      <div class="anote-title">ШАПКА КОМПАНИИ</div>
      <div class="anote-desc">из справочника <code>OrgUnitHead</code> — снепшот директора на дату submit</div>
    </div>
  </div>
  <div class="anote">
    <div class="anote-marker"></div>
    <div>
      <div class="anote-title">ОТРЕНДЕРЕННОЕ ТЕЛО</div>
      <div class="anote-desc">Django-шаблон + значения полей; auto-escape, безопасно по умолчанию</div>
    </div>
  </div>
  <div class="anote">
    <div class="anote-marker"></div>
    <div>
      <div class="anote-title">CANVAS-ПОДПИСЬ</div>
      <div class="anote-desc"><code>data:image/png</code> — рисуется мышью или пальцем согласующим</div>
    </div>
  </div>
  <div class="anote">
    <div class="anote-marker"></div>
    <div>
      <div class="anote-title">КЕШ 7 ДНЕЙ</div>
      <div class="anote-desc">регенерация при любом изменении полей или подписей</div>
    </div>
  </div>
  <div class="anote">
    <div class="anote-marker"></div>
    <div>
      <div class="anote-title">ZIP-АРХИВ</div>
      <div class="anote-desc">экспорт всех документов за период со всеми вложениями</div>
    </div>
  </div>
</div>

</div>

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

<!-- _class: audit -->

## Audit и снепшоты

<div class="audit-grid">

<div class="audit-col">
  <div class="audit-head">МОМЕНТ SUBMIT</div>
  <div class="audit-title">Снепшоты в БД</div>
  <div class="audit-item">
    <code>chain_snapshot</code>
    <span>JSON цепочки на момент отправки</span>
  </div>
  <div class="audit-item">
    <code>body_rendered</code>
    <span>Отрендеренный текст документа</span>
  </div>
  <div class="audit-item">
    <code>header_snapshot</code>
    <span>Название компании + директор</span>
  </div>
</div>

<div class="audit-col">
  <div class="audit-head">ПОСЛЕДСТВИЯ</div>
  <div class="audit-row">
    <div class="audit-row-title">Смена типа документа</div>
    <div class="audit-row-desc">Старые идут по своей цепочке</div>
  </div>
  <div class="audit-row">
    <div class="audit-row-title">Смена директора</div>
    <div class="audit-row-desc">PDF-архив сохраняет старого</div>
  </div>
  <div class="audit-row">
    <div class="audit-row-title">Кадровые перестановки</div>
    <div class="audit-row-desc">История решений нерушима</div>
  </div>
</div>

<div class="audit-col audit-result">
  <div class="audit-head accent">РЕЗУЛЬТАТ</div>
  <div class="audit-title">Audit-grade архив</div>
  <ul class="audit-checks">
    <li>Каждое решение фиксировано</li>
    <li>Кто, когда, какой комментарий</li>
    <li><code>simple_history</code> на всех моделях</li>
    <li><code>original_approver</code> при делегировании</li>
    <li>PDF-копия с подписями</li>
  </ul>
</div>

</div>

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