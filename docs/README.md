# Документация Bresler ERP

## Модуль ЭДО — внутренний документооборот

| Файл | Аудитория | Что внутри |
|---|---|---|
| [edo_user_guide.md](edo_user_guide.md) | Сотрудники | 13 разделов: создание документа, согласование, замещения, FAQ, troubleshooting |
| [edo_admin_guide.md](edo_admin_guide.md) | Администраторы | Конструктор типов, шаблоны цепочек, отчёты, bulk-операции, диагностика |
| [edo_test_scenarios.md](edo_test_scenarios.md) | QA / regression | 50+ сценариев по 11 ролевым группам + минимальный чек-лист релиза |
| [edo_presentation.md](edo_presentation.md) | Заказчики, ознакомление | Marp-презентация (~22 слайда) — обзор возможностей, цифры, сравнение с рынком |

## Как открыть презентацию

`edo_presentation.md` — это [Marp](https://marp.app)-формат: markdown с YAML-frontmatter,
рендерится в HTML/PDF/PPTX тремя способами:

### 1. VS Code (самый удобный)

1. Установить расширение [«Marp for VS Code»](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode).
2. Открыть `edo_presentation.md`.
3. Кнопка **«Open Preview to the Side»** (Ctrl+K V) — живой превью.
4. Команда **«Marp: Export slide deck...»** — экспорт в PDF / PPTX / HTML.

### 2. CLI (одной командой)

```bash
npx @marp-team/marp-cli docs/edo_presentation.md --pdf
# → docs/edo_presentation.pdf

npx @marp-team/marp-cli docs/edo_presentation.md --pptx
# → docs/edo_presentation.pptx
```

### 3. Online без установки

[web.marp.app](https://web.marp.app) — открыть, paste содержимое файла, скачать PDF/PPTX.

### 4. Просто читать как markdown

В GitLab/GitHub превью покажет markdown с горизонтальными разделителями (`---`)
между слайдами — читается, но без слайдовой презентации. Кастомный CSS не
применится (это нормально для исходника).
