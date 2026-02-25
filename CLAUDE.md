# CLAUDE.md — Bresler ERP

## Project overview

Bresler ERP — корпоративная ERP-система, переписанная с нуля (замена legacy Django 4.2 + jQuery).
Модульный монолит: Django 5.2 LTS + DRF (backend) и React 19 + TypeScript (frontend) в монорепе.

**Текущая фаза:** MVP (Фаза 1) — Заказы + Справочники.
Подробный план: `plan_bresler_erp.md`.

## Tech stack

**Backend:** Django 5.2, DRF 3.15, PostgreSQL 16, Redis 7, Celery 5.4, Channels 4.2 (WebSocket), SimpleJWT, drf-spectacular (OpenAPI), django-treebeard (деревья), django-simple-history (аудит), django-filter
**Frontend:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand (state), TanStack Query + Table, React Hook Form + Zod, Axios, React Router 7
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
│   │   ├── core/              # BaseModel, pagination, permissions, exceptions
│   │   ├── users/             # User model (AbstractUser), JWT auth, profiles
│   │   ├── directory/         # Справочники: OrgUnit (tree), Country, City, Contact, Equipment, etc.
│   │   └── orders/            # Order, Contract, OrderFile, WebSocket presence
│   ├── requirements/          # base.txt, development.txt, production.txt, test.txt
│   ├── conftest.py            # Pytest fixtures (api_client, user, authenticated_client)
│   ├── pytest.ini             # Pytest config (settings: config.settings.test)
│   └── pyproject.toml         # Ruff + MyPy config
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── api/               # Axios client, TypeScript types, React Query hooks
│   │   ├── components/        # ui/ (shadcn), layout/ (AppLayout, Sidebar, Header), shared/
│   │   ├── features/          # auth/, directory/, orders/, profile/
│   │   ├── hooks/             # useDebounce, useMediaQuery
│   │   ├── stores/            # Zustand: useAuthStore, useUIStore
│   │   ├── routes/            # React Router config
│   │   └── lib/               # Utilities, constants
│   ├── vite.config.ts         # Vite config with API proxy to backend
│   └── package.json
├── docker/                    # Nginx (prod) + PostgreSQL init
├── docker-compose.yml         # Dev environment
├── docker-compose.prod.yml    # Production environment
├── Makefile                   # Common commands
└── plan_bresler_erp.md        # Detailed implementation plan
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
- **Audit trail:** `simple_history` on Order, Contract, OrgUnit, PQ. Tracking history of changes.
- **previous_names:** OrgUnit and PQ track name changes via JSONField + pre_save signal.
- **JWT auth:** SimpleJWT, 30-min access token, 7-day refresh. Tokens in Zustand store with localStorage persistence.
- **API patterns:** All ViewSets use DRF ModelViewSet + django-filter. Pagination: 50 items/page default.
- **Frontend data fetching:** TanStack React Query custom hooks per entity (`useContacts`, `useCountries`, etc.).
- **Frontend forms:** React Hook Form + Zod validation + shadcn/ui form components.
- **Generic CRUD:** `ReferenceTablePage` component for simple reference entities (Equipment, TypeOfWork, etc.).

## API structure

```
/api/auth/token/           # POST - JWT login
/api/auth/token/refresh/   # POST - Refresh token
/api/auth/token/verify/    # POST - Verify token
/api/users/me/             # GET/PATCH - Current user profile
/api/users/                # GET - List users
/api/directory/orgunits/   # CRUD + tree ops (children, ancestors, tree, search)
/api/directory/countries/   # CRUD
/api/directory/cities/      # CRUD
/api/directory/contacts/    # CRUD
/api/directory/equipment/   # CRUD
/api/directory/works/       # CRUD
/api/directory/delivery-types/  # CRUD
/api/directory/intermediaries/  # CRUD
/api/directory/designers/   # CRUD
/api/directory/pqs/         # CRUD
/api/orders/               # CRUD + history, files, next-number
/api/orders/{id}/contract/ # GET/PATCH
/api/schema/               # OpenAPI JSON schema
/api/docs/                 # Swagger UI
/api/redoc/                # ReDoc
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
- Run: `cd backend && pytest --cov=apps --cov-report=term-missing -v`

**Frontend:**
- Framework: Vitest (not yet fully configured)

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
- **Order** — order with statuses (NEW/IN_PROGRESS/COMPLETED/TENDER/ARCHIVED), M2M to OrgUnit, Contact, User (managers), Equipment, PQ
- **Contract** — OneToOne to Order, payment statuses and amounts
- **Reference entities** — Equipment, TypeOfWork, DeliveryType, Intermediary, Designer, PQ

## Current status

Backend: apps core, users, directory, orders — models, services, API all implemented. Directory has comprehensive tests (~130+). Orders backend ready but tests not yet written.
Frontend: auth flow, layout, directory CRUD pages implemented. Orders UI not started.
See `plan_bresler_erp.md` section 6 for detailed weekly plan with checkboxes.
