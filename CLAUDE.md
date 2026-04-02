# CLAUDE.md — Bresler ERP

## Project overview

Bresler ERP — корпоративная ERP-система, переписанная с нуля (замена legacy Django 4.2 + jQuery).
Модульный монолит: Django 5.2 LTS + DRF (backend) и React 19 + TypeScript (frontend) в монорепе.

Подробные планы: `plan_bresler_erp.md` (MVP), `plan_best_practices.md` (фазы улучшений из open source ERP).

## Tech stack

**Backend:** Django 5.2, DRF 3.15, PostgreSQL 16, Redis 7, Celery 5.4, Channels 4.2 (WebSocket), SimpleJWT, drf-spectacular (OpenAPI), django-treebeard (деревья), django-simple-history (аудит), django-filter, openpyxl (Excel export/import)
**Frontend:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand (state), TanStack Query + Table, React Hook Form + Zod, Axios, React Router 7, Recharts (графики)
**DevOps:** Docker Compose (dev + prod), Nginx, GitLab CI/CD

## Project structure

```
bresler-erp/
├── backend/                   # Django REST API
│   ├── config/                # Django project config
│   │   ├── settings/          # base.py, development.py, production.py, test.py
│   │   ├── urls.py            # Root URL routing
│   │   ├── celery.py          # Celery app
│   │   └── asgi.py / wsgi.py
│   ├── apps/
│   │   ├── core/              # BaseModel, events, workflow, naming, export/metadata mixins, links
│   │   ├── users/             # User model (AbstractUser), JWT auth, profiles
│   │   ├── directory/         # Справочники: OrgUnit (tree), Country, City, Contact, Equipment, etc.
│   │   ├── orders/            # Order, Contract, OrderFile, WebSocket presence, workflows
│   │   ├── devices/           # Устройства РЗА: каталог, параметры, компоненты, продукция
│   │   ├── comments/          # Comment (GenericFK) + event handlers
│   │   ├── notifications/     # Notification, NotificationPreference, WebSocket, Celery tasks
│   │   ├── importer/          # CSV/Excel import wizard (session-based)
│   │   └── reports/           # Report engine + dashboard API
│   ├── requirements/          # base.txt, development.txt, production.txt, test.txt
│   ├── conftest.py            # Pytest fixtures (api_client, user, authenticated_client)
│   ├── pytest.ini             # Pytest config (settings: config.settings.test)
│   └── pyproject.toml         # Ruff + MyPy config
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── api/               # Axios client, TypeScript types, React Query hooks
│   │   ├── components/        # ui/ (shadcn), layout/ (AppLayout, Sidebar, Header), shared/
│   │   ├── features/          # auth/, directory/, orders/, profile/, dashboard/, reports/, import/
│   │   ├── hooks/             # useDebounce, useMediaQuery, useAutoFilters
│   │   ├── stores/            # Zustand: useAuthStore, useUIStore
│   │   ├── routes/            # React Router config
│   │   └── lib/               # Utilities, constants
│   ├── vite.config.ts         # Vite config with API proxy to backend
│   └── package.json
├── docker/                    # Nginx (prod) + PostgreSQL init
├── docker-compose.yml         # Dev environment
├── docker-compose.prod.yml    # Production environment
├── Makefile                   # Common commands
├── plan_bresler_erp.md        # Detailed implementation plan (MVP)
└── plan_best_practices.md     # Best practices plan (phases 1-6)
```

## Development commands

```bash
# Docker (primary way to run)
make dev                # Start all services (db, redis, backend, frontend, celery)
make docker-down        # Stop all services

# Backend (local, outside Docker)
make migrate            # Apply migrations
make makemigrations     # Create new migrations
make shell              # Django shell_plus
make createsuperuser    # Create admin user

# Testing
make test               # Run all tests (backend + frontend)
make test-backend       # pytest --cov=apps --cov-report=term-missing -v
make test-frontend      # vitest --run

# Run tests locally (with venv):
cd backend && venv/bin/python -m pytest --tb=short -q

# Linting
make lint               # ruff check + format --check (backend), eslint + tsc --noEmit (frontend)
make lint-fix           # Auto-fix lint issues
make format             # ruff format (backend only)

# OpenAPI
make schema             # Generate OpenAPI schema (backend/schema.yml)
make types              # Generate TypeScript types from running backend API

# Production
make prod               # Start production environment
make prod-build         # Build and start production
```

## Architecture patterns

- **Service layer:** Business logic lives in `apps/<app>/services/`, not in views. Views are thin — delegate to services.
- **Tree structures:** OrgUnit uses django-treebeard `MP_Node` (Materialized Path). Use `add_child()`, `move()`, not raw SQL.
- **Unified OrgUnit:** All companies (customers, intermediaries, designers, etc.) stored in OrgUnit with `business_role` field. No separate Intermediary/Designer/PQ models.
- **Audit trail:** `simple_history` on Order, Contract, OrgUnit. Tracking history of changes.
- **previous_names:** OrgUnit tracks name changes via JSONField + pre_save signal.
- **JWT auth:** SimpleJWT, 30-min access token, 7-day refresh. Tokens in Zustand store with localStorage persistence.
- **LDAP auth (production):** `django-auth-ldap` + Active Directory. Активируется при наличии `AUTH_LDAP_SERVER_URI` в env. Fallback на `ModelBackend`. Конфиг: `production.py`, env-переменные в `.env.prod.example`.
- **API patterns:** All ViewSets use DRF ModelViewSet + django-filter. Pagination: 50 items/page default.
- **Frontend data fetching:** TanStack React Query custom hooks per entity (`useContacts`, `useCountries`, etc.).
- **Frontend forms:** React Hook Form + Zod validation + shadcn/ui form components.
- **Generic CRUD:** `ReferenceTablePage` component for simple reference entities (Equipment, TypeOfWork, etc.).

### Event System (`apps/core/events.py`)

Обобщённая шина событий. Любое значимое действие генерирует событие, на которое подписываются обработчики.

```python
# Регистрация обработчика (async_task=True → выполняется через Celery, не блокирует запрос):
@on_event("order.created", async_task=True)
def notify_managers(event_name, instance, user=None, **kwargs):
    create_notification(...)

# Генерация события из сервиса:
trigger_event("order.created", instance=order, user=request.user)

# Подавление событий при массовых операциях (импорт):
with suppress_events():
    for row in data:
        Model.objects.create(...)
```

Текущие события: `order.created`, `order.status_changed`, `contract.created`, `contract.payment_changed`, `comment.created`, `import.completed`. Авто-события из `post_save`: `contract.created/updated/deleted`, `orgunit.created/updated/deleted`, `contact.created/updated/deleted`.

### Notification System (`apps/notifications/`)

- `Notification` (GenericFK) — привязка к любому объекту, категории info/success/warning/error
- `NotificationEntry` — дедупликация (не слать одно и то же чаще раза в N часов)
- `NotificationPreference` — per-user настройки каналов (bell/email/all/none) по категориям событий
- WebSocket consumer (`ws/notifications/`) — real-time push
- **Email-уведомления:** немедленная отправка при создании уведомления (если пользователь включил email/all в preferences) + ежедневный email-дайджест непрочитанных
- Celery Beat задачи: `check_order_deadlines()` (ежедневно), `send_email_digest()` (ежедневно), `cleanup_old_notifications()` (еженедельно)
- SMTP настраивается через env-переменные: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`, `SITE_URL`
- В development — `console.EmailBackend` (печатает в stdout), в production — `smtp.EmailBackend`
- Все notification handlers используют `async_task=True` — не блокируют HTTP-ответ

### Workflow Engine (`apps/core/workflow/`)

Dataclass-based определение допустимых переходов между статусами. `WorkflowService.transition()` проверяет: текущий статус → допустимость перехода → роль пользователя → условия (например, контракт существует). Генерирует event при переходе.

```python
# Определение в apps/orders/workflows.py:
ORDER_WORKFLOW = WorkflowConfig(transitions=[
    TransitionDef(from_state="N", to_state="D", allowed_groups=["otm", "admin"], condition=require_contract_exists),
    ...
])

# Использование:
WorkflowService.transition(order, "D", user=request.user, workflow=ORDER_WORKFLOW)
```

API: `GET /api/orders/{id}/transitions/` → доступные переходы, `POST /api/orders/{id}/transition/` → выполнить.

### Export/Import

- **Export:** `ExportMixin` в ViewSet → `GET /api/orders/export/?format=xlsx` (CSV/XLSX, учитывает текущие фильтры)
- **Import:** `apps/importer/` — session-based wizard: Upload → Mapping → Validation (dry-run) → Apply. Async через Celery для больших файлов. События подавляются через `suppress_events()` при массовом создании.

### Naming Series (`apps/core/naming.py`)

Атомарная автонумерация документов. `NamingService.generate("contract")` → `"ДОГ-2026-0001"`. Thread-safe через `select_for_update()` + F-expression. Поддержка шаблонов: `{prefix}-{YYYY}-{####}`.

### Metadata-driven Filters (`apps/core/mixins/metadata.py`)

`MetadataMixin` добавляет `GET /meta/` endpoint к ViewSet — возвращает описание всех фильтров, search_fields, ordering_fields. Frontend автоматически строит UI фильтров из метаданных.

**Как добавить metadata-driven фильтры к новому ViewSet:**

Backend:
```python
from apps.core.mixins.metadata import MetadataMixin

class MyViewSet(MetadataMixin, ModelViewSet):
    filterset_class = MyFilter
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]
    # Опционально: widget hints для frontend
    meta_extra = {
        "customer": {"widget": "combobox", "endpoint": "/api/directory/orgunits/?business_role=customer"},
        "country": {"widget": "combobox", "endpoint": "/api/directory/countries/"},
        "ship_date_from": {"range_group": "ship_date"},
        "ship_date_to": {"range_group": "ship_date"},
    }
```

Frontend:
```tsx
import { useFilterMeta } from "@/api/hooks/useFilterMeta"
import { useAutoFilters } from "@/hooks/useAutoFilters"
import { AutoFilters } from "@/components/shared/AutoFilters"

const { data: meta } = useFilterMeta("/my-endpoint/")
const { values, setValue, reset, hasActiveFilters, params } = useAutoFilters(meta?.filters)

// В JSX:
<AutoFilters
  filters={meta?.filters ?? []}
  values={values}
  onChange={(name, val) => { setValue(name, val); setPage(1) }}
  onReset={() => { reset(); setPage(1) }}
  hasActiveFilters={hasActiveFilters}
/>

// params передать в API-запрос:
const listParams = { page, page_size: 20, ...params }
```

AutoFilters автоматически рендерит: `choice` → Select, `boolean` → Select (Да/Нет), `date` → DateInput, `combobox` + endpoint → SearchableSelect/OrgUnitCombobox, `text`/`number` → Input.

### Comments + Timeline (`apps/comments/`)

`Comment` модель с GenericFK → привязка к любому объекту. Frontend `Timeline.tsx` объединяет комментарии и simple_history записи в единую ленту. Интегрирован в OrderDetailPage.

### Linked Documents (`apps/core/links.py`)

`DocumentLink` с двойным GenericFK (source + target) — универсальные связи между любыми объектами. API: `/api/links/`. Frontend: `LinkedDocuments.tsx`.

### Reports + Dashboard (`apps/reports/`)

`BaseReport` → dataclass-based отчёты с фильтрами, колонками, графиками. 6 готовых отчётов. `DashboardView` — агрегированные данные для главной страницы (NumberCards + Recharts charts).

## API structure

```
# Auth
/api/auth/token/                    # POST - JWT login
/api/auth/token/refresh/            # POST - Refresh token
/api/auth/token/verify/             # POST - Verify token
/api/users/me/                      # GET/PATCH - Current user profile
/api/users/                         # GET - List users

# Directory
/api/directory/orgunits/            # CRUD + tree ops + /meta/ + /export/
/api/directory/countries/            # CRUD
/api/directory/cities/               # CRUD
/api/directory/contacts/             # CRUD + /export/
/api/directory/equipment/            # CRUD
/api/directory/works/                # CRUD
/api/directory/delivery-types/       # CRUD
/api/directory/facilities/           # CRUD

# Orders
/api/orders/                        # CRUD + /meta/ + /export/ + history, files, next-number
/api/orders/{id}/contract/          # GET/PATCH
/api/orders/{id}/transitions/       # GET - available workflow transitions
/api/orders/{id}/transition/        # POST - execute workflow transition

# Comments & Links
/api/comments/                      # CRUD (GenericFK, filter by target_model + target_id)
/api/links/                         # CRUD (DocumentLink, filter by source/target)

# Notifications
/api/notifications/                 # GET list (paginated)
/api/notifications/unread-count/    # GET
/api/notifications/{id}/mark-read/  # POST
/api/notifications/mark-all-read/   # POST
/api/notifications/preferences/     # GET/PATCH - user notification settings

# Import
/api/import/upload/                 # POST - upload file + auto-map
/api/import/{id}/fields/            # GET - available fields for target model
/api/import/{id}/mapping/           # PATCH - update column mapping
/api/import/{id}/validate/          # POST - dry-run validation
/api/import/{id}/apply/             # POST - apply import

# Reports & Dashboard
/api/reports/                       # GET - list available reports
/api/reports/{name}/                # GET - execute report with filters
/api/dashboard/                     # GET - aggregated dashboard data

# Docs
/api/schema/                        # OpenAPI JSON schema
/api/docs/                          # Swagger UI
/api/redoc/                         # ReDoc
```

## Code style

**Backend (Python):**
- Ruff linter: rules E, F, I, N, W, UP, B, SIM. Line length: 120. Ignore: E501.
- isort: known first-party = `apps`, `config`
- MyPy: Python 3.12, Django stubs enabled
- Target: Python 3.12

**Frontend (TypeScript):**
- ESLint with react-hooks and react-refresh plugins
- TypeScript strict mode
- Path alias: `@/` → `./src/`
- Tailwind CSS 4 for styling

## Testing

**Backend:**
- Framework: pytest with `DJANGO_SETTINGS_MODULE=config.settings.test` (SQLite in-memory)
- Coverage target: ≥80%
- Test location: `apps/<app>/tests/` (test_models.py, test_api.py, test_services.py)
- Factories: Factory Boy (`apps/<app>/tests/factories.py`)
- Global fixtures in `backend/conftest.py`: `api_client`, `user`, `authenticated_client`
- Run: `cd backend && venv/bin/python -m pytest --tb=short -q`
- Note: pytest-mock не установлен, использовать `unittest.mock.patch` вместо `mocker`
- Known failures: 3 order tests use old Status.IN_PROGRESS/COMPLETED (pre-existing, not related to new code)

**Frontend:**
- Framework: Vitest (not yet fully configured)
- TypeScript check: `npx tsc --noEmit`

## Docker services (dev)

| Service    | Image/Build       | Port         | Notes                           |
|------------|-------------------|--------------|---------------------------------|
| db         | postgres:16-alpine| 5433:5432    | DB: bresler_erp, healthcheck    |
| redis      | redis:7-alpine    | 6380:6379    | Cache (DB 1), Celery (DB 0)    |
| backend    | ./backend (dev)   | 8000:8000    | Django runserver, volume mount  |
| frontend   | ./frontend (dev)  | 5173:5173    | Vite dev server, HMR            |
| celery     | ./backend (dev)   | —            | Celery worker                   |

## Environment variables

See `.env.example`. Key variables:
- `DJANGO_SETTINGS_MODULE` — settings module (development/production/test)
- `DJANGO_SECRET_KEY` — secret key
- `POSTGRES_*` — database connection
- `REDIS_URL` — Redis for cache
- `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` — Celery config

## Key models

- **User** (AbstractUser) — patronymic, phone, position, department, company, avatar
- **OrgUnit** (MP_Node tree) — company/branch/division/department/site with business roles
- **Contact** — persons linked M2M to OrgUnit
- **Facility** — site/facility linked to OrgUnit
- **Order** — order with workflow statuses (NEW/CONTRACT/PRODUCTION/ASSEMBLED/SHIPPED/ARCHIVED), FK to OrgUnit (customer, intermediary, designer), M2M to Contact, User (managers), Equipment
- **Contract** — OneToOne to Order, payment statuses and amounts, auto-numbered via NamingService
- **Comment** — GenericFK to any model, author, text
- **Notification** — GenericFK target, recipient, category, is_read, WebSocket push
- **NotificationPreference** — OneToOne to User, per-category channel settings (bell/email/all/none)
- **DocumentLink** — double GenericFK (source + target), universal document relationships
- **NumberSequence** — configurable auto-numbering (prefix, pattern, yearly reset)
- **ImportSession** — file upload, column mapping, validation, status tracking
- **Reference entities** — Equipment, TypeOfWork, DeliveryType

## Current status (план plan_best_practices.md)

| Фаза | Описание | Статус |
|------|----------|--------|
| 1.1 | Event System (шина событий) | ✅ Готово — trigger_event, @on_event, suppress_events, async via Celery |
| 1.2 | Уведомления | ✅ Готово — Notification + Preference + WebSocket + Celery Beat + admin |
| 1.3 | Комментарии + Timeline | ✅ Готово — Comment (GenericFK), Timeline компонент, интеграция в OrderDetailPage |
| 2.1 | Export (CSV/Excel) | ✅ Готово — ExportMixin, 4 ViewSet'а, ExportButton frontend |
| 2.2 | Import (CSV/Excel) | ✅ Готово — session-based wizard, 4 шага, Celery async |
| 2.3 | Naming Series | ✅ Готово — NumberSequence, NamingService, интеграция в Contract |
| 3.1 | Workflow Engine | ✅ Готово — WorkflowConfig + WorkflowService, Order + Contract workflows |
| 3.2 | Linked Documents | ✅ Готово — DocumentLink, API, LinkedDocuments frontend |
| 4.1 | Система отчётов | ✅ Готово — BaseReport, 6 отчётов, Recharts frontend |
| 4.2 | Dashboard | ✅ Готово — DashboardView, NumberCards, pie/line charts |
| 5.1 | Metadata-driven фильтры | ✅ Готово — MetadataMixin, AutoFilters frontend, интеграция в OrgUnitsPage |
| 6.1 | Модернизация ProfilePage | ✅ Готово — MyOrders, Activity, Settings (уведомления + смена пароля), Avatar upload, Quick stats |

EDO module: разрабатывается отдельным разработчиком. Legacy: `/home/serj/PyCharm/Projects/marketing` (модуль edo).
