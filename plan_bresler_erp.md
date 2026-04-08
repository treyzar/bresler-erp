# Bresler ERP — План создания нового проекта

## Контекст

Текущая ERP-система Marketing OTM (Django 4.2, jQuery, 20K строк, 0% тестов, god-объекты) переписывается с нуля. Цель — современная, тестируемая, модульная система с React-фронтендом.

**Решения:** Django 5.2 LTS + DRF | React 19 + shadcn/ui | Монорепа | MVP = Заказы + Справочники | Полная миграция данных (позже)

**Расположение:** `/home/serj/PyCharm/Projects/bresler-erp`

---

## 1. Структура проекта (монорепа)

```
bresler-erp/
├── backend/
│   ├── config/                     # Django project configuration
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # Общие настройки
│   │   │   ├── development.py     # DEBUG=True, CORS localhost
│   │   │   ├── production.py      # HTTPS, HSTS, secure cookies
│   │   │   └── test.py            # SQLite in-memory, fast passwords
│   │   ├── urls.py                # Root URL config
│   │   ├── wsgi.py
│   │   ├── asgi.py
│   │   └── celery.py
│   │
│   ├── apps/
│   │   ├── core/                  # Общие компоненты
│   │   │   ├── models.py          # BaseModel(created_at, updated_at)
│   │   │   ├── permissions.py     # IsOwnerOrReadOnly, GroupPermission
│   │   │   ├── pagination.py      # StandardPagination(page_size=50)
│   │   │   ├── exceptions.py      # Custom exception handler
│   │   │   ├── mixins.py          # AuditMixin, SlugMixin
│   │   │   └── utils.py
│   │   │
│   │   ├── users/                 # Аутентификация и пользователи
│   │   │   ├── models.py          # User (AbstractUser + patronymic, phone, position, dept, avatar)
│   │   │   ├── api/
│   │   │   │   ├── serializers.py # UserSerializer, LoginSerializer, ProfileSerializer
│   │   │   │   ├── views.py       # TokenObtainView, ProfileView, UserViewSet
│   │   │   │   ├── urls.py        # /api/auth/token/, /api/auth/refresh/, /api/users/me/
│   │   │   │   └── filters.py
│   │   │   ├── services/
│   │   │   │   └── auth_service.py  # LDAP login → JWT, profile sync
│   │   │   ├── backends.py        # LDAPAuthBackend
│   │   │   ├── admin.py
│   │   │   └── tests/
│   │   │       ├── factories.py   # UserFactory
│   │   │       ├── test_models.py
│   │   │       ├── test_api.py
│   │   │       └── test_auth.py
│   │   │
│   │   ├── directory/             # Справочники и оргструктура
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── geography.py   # Country, City
│   │   │   │   ├── orgunit.py     # OrgUnit (MP_Node tree)
│   │   │   │   ├── contacts.py    # Contact (M2M to OrgUnit)
│   │   │   │   └── references.py  # Equipment, TypeOfWork, DeliveryType
│   │   │   ├── api/
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py       # ViewSets для всех справочников
│   │   │   │   ├── urls.py
│   │   │   │   └── filters.py
│   │   │   ├── services/
│   │   │   │   ├── orgunit_service.py   # Tree operations
│   │   │   │   └── directory_service.py # CRUD + previous_names tracking
│   │   │   ├── signals.py         # previous_names tracking on pre_save
│   │   │   ├── admin.py           # TreeAdmin для OrgUnit
│   │   │   └── tests/
│   │   │       ├── factories.py   # CountryFactory, OrgUnitFactory, CustomerFactory...
│   │   │       ├── test_models.py
│   │   │       ├── test_services.py
│   │   │       └── test_api.py
│   │   │
│   │   ├── orders/                # Заказы и контракты
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── order.py       # Order (statuses, M2M, history)
│   │   │   │   ├── contract.py    # Contract (OneToOne → Order)
│   │   │   │   └── files.py       # OrderFile
│   │   │   ├── api/
│   │   │   │   ├── serializers.py # OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer
│   │   │   │   ├── views.py       # OrderViewSet, ContractViewSet
│   │   │   │   ├── urls.py
│   │   │   │   └── filters.py     # OrderFilter (status, customer, date range)
│   │   │   ├── services/
│   │   │   │   ├── order_service.py    # create_order, update_order, next_number
│   │   │   │   └── contract_service.py # update_contract, change_status
│   │   │   ├── consumers.py       # OrderPresenceConsumer (WebSocket)
│   │   │   ├── routing.py         # ws/orders/<number>/presence/
│   │   │   ├── signals.py
│   │   │   ├── admin.py
│   │   │   └── tests/
│   │   │       ├── factories.py   # OrderFactory, ContractFactory
│   │   │       ├── test_models.py
│   │   │       ├── test_services.py
│   │   │       └── test_api.py
│   │   │
│   │   ├── devices/               # (Фаза 2) Каталог терминалов
│   │   ├── specs/                 # (Фаза 2) Спецификации и ТКП
│   │   └── edo/                   # Электронный документооборот (разрабатывается отдельным разработчиком, интеграция позже)
│   │
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   ├── production.txt
│   │   └── test.txt
│   ├── manage.py
│   ├── pytest.ini
│   ├── pyproject.toml             # ruff, mypy config
│   ├── Dockerfile              # Multi-stage: dev + prod targets
│   ├── .dockerignore
│   └── entrypoint.sh           # wait-for-db, migrate, dispatch (gunicorn/daphne/celery)
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # Автогенерированные типы из OpenAPI
│   │   │   ├── client.ts          # Axios instance + JWT interceptor
│   │   │   ├── types.ts           # Сгенерированные из OpenAPI
│   │   │   └── hooks/             # useOrders(), useDirectory() etc.
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui компоненты
│   │   │   ├── layout/            # AppLayout, Sidebar, Header
│   │   │   └── shared/            # DataTable, OrgUnitCombobox, EntityFormDialog, ConfirmDialog
│   │   ├── features/
│   │   │   ├── auth/              # LoginPage, useAuth, ProtectedRoute, jwt-manager
│   │   │   ├── orders/            # OrderList, OrderDetail, OrderForm, OrderHistory
│   │   │   ├── directory/         # OrgUnitTree, CustomerList, ContactForm...
│   │   │   └── profile/           # ProfilePage
│   │   ├── hooks/                 # useDebounce, useMediaQuery
│   │   ├── lib/                   # utils, date formatting, constants
│   │   ├── stores/                # Zustand: useAuthStore, useUIStore
│   │   ├── routes/                # Router config
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json            # shadcn/ui config
│   ├── Dockerfile              # Dev-only target (npm ci, Vite dev server)
│   └── .dockerignore
│
├── docker/
│   ├── nginx/
│   │   ├── Dockerfile.prod     # Multi-stage: build React + nginx:1.27-alpine
│   │   ├── nginx.prod.conf     # SSL, dual upstream (gunicorn+daphne), SPA fallback
│   │   └── ssl/                # cert.pem + key.pem (not in git)
│   │       └── .gitkeep
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml          # DEV (default: docker compose up)
├── docker-compose.prod.yml     # PRODUCTION (docker compose -f ... up -d)
├── .dockerignore               # Root level (for nginx prod build context)
├── .env.example                # Dev env template (in git)
├── .env.prod.example           # Prod env template (in git)
├── .gitlab-ci.yml
├── Makefile                    # make dev, make test, make prod, make prod-build...
├── .gitignore
└── README.md
```

---

## 2. Модели данных MVP

### 2.1 core/models.py — Базовые модели

```python
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

### 2.2 users/models.py — Пользователь

```python
class User(AbstractUser):
    patronymic = CharField(max_length=150, blank=True)       # Отчество
    phone = CharField(max_length=50, blank=True)
    extension_number = CharField(max_length=20, blank=True)   # Внутренний номер
    position = CharField(max_length=150, blank=True)          # Должность
    department = CharField(max_length=150, blank=True)
    company = CharField(max_length=150, blank=True)
    avatar = ImageField(upload_to='avatars/', blank=True, null=True)

    def get_full_name(self):
        return f"{self.last_name} {self.first_name} {self.patronymic}".strip()
```

### 2.3 directory/models/ — Справочники

**geography.py:**
- `Country(BaseModel)` — name, code (ISO 3166)
- `City(BaseModel)` — name, FK→Country

**orgunit.py:**
- `OrgUnit(MP_Node)` — name, full_name, unit_type (COMPANY/BRANCH/DIVISION/DEPARTMENT/SITE), business_role (CUSTOMER/SUPPLIER/PARTNER/...), is_legal_entity, country→FK, inn, kpp, ogrn, external_code, address, previous_names (JSONField), is_active
  - Indexes: name, inn, external_code, business_role
  - History: simple_history
  - Validation: Companies = root nodes only

**contacts.py:**
- `Contact(BaseModel)` — full_name, position, email, phone, address, city, company, M2M→OrgUnit

**references.py:**
- `Equipment(BaseModel)` — name
- `TypeOfWork(BaseModel)` — name
- `DeliveryType(BaseModel)` — name

> **Архитектурное решение:** Модели Intermediary, Designer, PQ удалены. Все компании хранятся в OrgUnit, взаимодействие определяется через `business_role` (CUSTOMER, SUPPLIER, PARTNER, DESIGNER, PARTICIPANT и др.).

### 2.4 orders/models/ — Заказы

**order.py:**
- `Order(BaseModel)` — order_number (unique, auto-increment), tender_number, status (N/P/C/T/A), note, start_date, ship_date
  - FK: customer_org_unit→OrgUnit, intermediary→OrgUnit (business_role=partner), designer→OrgUnit (business_role=designer), country→Country
  - M2M: org_units (through OrderOrgUnit with role), contacts, managers→User, equipments, works, participants (through OrderParticipant), related_orders→self
  - History: simple_history

- `OrderOrgUnit` (through) — order→FK, org_unit→FK, role, order_index, note. Unique: (order, org_unit, role)

- `OrderParticipant` (through) — order→FK, org_unit→FK, order_index (участники ЦЗ)

**contract.py:**
- `Contract(BaseModel)` — order→OneToOne, contract_number (unique), contract_date, status (not_paid/advance_paid/intermediate/fully_paid), advance%, intermediate%, post_payment%, amount (Decimal), deadline_days
  - History: simple_history

**files.py:**
- `OrderFile(BaseModel)` — order→FK, file (FileField), original_name, file_size

---

## 3. API-эндпоинты MVP

### Auth (`/api/auth/`)
```
POST   /api/auth/token/          # Login (username+password → JWT access+refresh)
POST   /api/auth/token/refresh/  # Refresh access token
POST   /api/auth/token/verify/   # Verify token validity
GET    /api/users/me/            # Current user profile + permissions + groups
PATCH  /api/users/me/            # Update own profile
GET    /api/users/               # List users (for manager selection etc.)
```

### Directory (`/api/directory/`)
```
# OrgUnit tree
GET    /api/directory/orgunits/              # List root nodes (flat, paginated)
POST   /api/directory/orgunits/              # Create org unit
GET    /api/directory/orgunits/{id}/          # Get org unit detail
PATCH  /api/directory/orgunits/{id}/          # Update org unit
DELETE /api/directory/orgunits/{id}/          # Delete (if no dependencies)
GET    /api/directory/orgunits/{id}/children/ # Get children
GET    /api/directory/orgunits/{id}/ancestors/# Get ancestors (breadcrumb)
GET    /api/directory/orgunits/tree/          # Full tree (compact)
GET    /api/directory/orgunits/search/        # Search across tree

# For each reference entity (countries, cities, contacts, equipment, works,
# delivery-types, facilities):
GET    /api/directory/{entity}/               # List (paginated, filterable, searchable)
POST   /api/directory/{entity}/               # Create
GET    /api/directory/{entity}/{id}/          # Detail
PATCH  /api/directory/{entity}/{id}/          # Update
DELETE /api/directory/{entity}/{id}/          # Delete
DELETE /api/directory/{entity}/bulk-delete/   # Bulk delete

# Contact-specific
GET    /api/directory/contacts/{id}/orgunits/ # Get linked org units
```

### Orders (`/api/orders/`)
```
GET    /api/orders/                           # List orders (paginated, filterable)
POST   /api/orders/                           # Create order
GET    /api/orders/{id}/                      # Order detail (full, with relations)
PATCH  /api/orders/{id}/                      # Update order
GET    /api/orders/{id}/history/              # Change history
GET    /api/orders/next-number/               # Get next order number
POST   /api/orders/{id}/upload-files/         # Upload files
GET    /api/orders/{id}/files/                # List files
DELETE /api/orders/{id}/files/{file_id}/      # Delete file

# Contract
GET    /api/orders/{id}/contract/             # Get contract
PATCH  /api/orders/{id}/contract/             # Update contract
```

### OpenAPI
```
GET    /api/schema/                           # OpenAPI 3.0 JSON schema
GET    /api/docs/                             # Swagger UI
GET    /api/redoc/                            # ReDoc
```

---

## 4. Docker-конфигурация

### Два окружения

**Dev** (`docker compose up` / `make dev`):
- Сервисы: db, redis, backend, frontend, celery
- backend: `target: dev`, runserver, код монтируется volume, порт 8000
- frontend: `target: dev`, Vite dev server, код монтируется volume, порт 5173
- db: postgres:16-alpine, порт 5433:5432, healthcheck
- redis: redis:7-alpine, порт 6380:6379, healthcheck
- Без nginx — Vite проксирует /api и /ws к backend
- env_file: `.env` (из корня проекта)

**Production** (`docker compose -f docker-compose.prod.yml up -d` / `make prod`):
- Сервисы: db, redis, backend (gunicorn), daphne, celery-worker, celery-beat, nginx
- backend/Dockerfile `target: prod` — один образ, разные команды через entrypoint.sh
- entrypoint.sh: wait-for-db/redis, migrate+collectstatic (только gunicorn), dispatch по команде
- nginx: multi-stage build (React → nginx:1.27-alpine), SSL, dual upstream (gunicorn:8000 + daphne:8001)
- Shared volumes: static_files, media_files
- SSL через volume mount: `./docker/nginx/ssl:/etc/nginx/ssl:ro`
- Только nginx выставляет порты наружу (80, 443)
- Внутренняя сеть `internal`, restart: unless-stopped
- YAML anchors `x-backend-common` для дедупликации
- env_file: `.env.prod`

---

## 5. CI/CD (.gitlab-ci.yml)

```
stages: [lint, test, build, deploy]

lint-backend:    ruff check + mypy
lint-frontend:   eslint + tsc --noEmit
test-backend:    pytest --cov (threshold 80%)
test-frontend:   vitest run
build:           docker build (backend + frontend)
deploy-staging:  ansible-playbook (manual trigger)
deploy-prod:     ansible-playbook (manual trigger, only from main)
```

---

## 6. Понедельный план реализации

### Фаза 1: MVP — Заказы + Справочники (6 недель)

**Неделя 1: Скаффолдинг проекта**
- [x] Создать `/home/serj/PyCharm/Projects/bresler-erp/`
- [x] Инициализировать git-репозиторий
- [x] Backend: `django-admin startproject config .`
- [x] Структура settings/ (base, development, production, test)
- [x] Установить зависимости: Django 5.2, DRF, simplejwt, drf-spectacular, cors-headers, simple-history, treebeard, django-filter, celery, channels, redis
- [x] Создать apps/core/ (BaseModel, pagination, permissions, exceptions)
- [x] Создать apps/users/ (User model, JWT auth endpoints, /api/users/me/)
- [x] Docker: docker-compose.yml (dev) + docker-compose.prod.yml (production)
- [x] pytest.ini, conftest.py, UserFactory
- [x] Тесты: auth endpoints (login, refresh, me)
- [x] pyproject.toml: ruff + mypy config
- [x] Makefile: dev, test, migrate, lint, shell, prod, prod-build, prod-logs...
- [x] Frontend: Vite 7 + React 19 + TypeScript 5.9
- [x] Установить: tailwindcss 4, shadcn/ui, react-router 7, axios, tanstack-query, zustand
- [x] .gitlab-ci.yml: lint + test + build + deploy stages
- [x] README.md с инструкцией запуска

**Неделя 2: Модуль Directory (backend)**
- [x] Создать apps/directory/ с моделями: Country, City, OrgUnit, Contact, Facility, Equipment, TypeOfWork, DeliveryType
- [x] Рефакторинг: удалены модели Intermediary, Designer, PQ — заменены бизнес-ролями OrgUnit
- [x] Миграции
- [x] Сервисы: orgunit_service.py (tree ops), directory_service.py (CRUD + previous_names)
- [x] Сигналы: previous_names tracking (pre_save)
- [x] API: ViewSets для всех справочников
- [x] API: OrgUnit tree endpoints (children, ancestors, tree, search)
- [x] API: Filters (search by name, filter by parent/country)
- [x] Admin: TreeAdmin для OrgUnit, ModelAdmin для остальных
- [x] Фабрики: CountryFactory, OrgUnitFactory, ContactFactory и т.д.
- [x] Тесты: модели, сервисы, API (CRUD + tree ops) — 130+ тестов
- [x] OpenAPI: /api/docs/ (Swagger UI) и /api/redoc/ работают через drf-spectacular

**Неделя 3: Модуль Orders (backend)**
- [x] Создать apps/orders/ с моделями: Order, OrderOrgUnit, OrderParticipant, Contract, OrderFile
- [x] Миграции
- [x] Сервисы: order_service.py (create, update, next_number), contract_service.py
- [x] API: OrderViewSet (list, create, retrieve, update, history, files)
- [x] API: ContractViewSet (get/update через order endpoint)
- [x] API: Filters (status, customer, date range, search)
- [x] WebSocket: OrderPresenceConsumer + routing
- [x] Admin: OrderAdmin с inlines
- [x] Фабрики: OrderFactory, ContractFactory, OrderFileFactory, OrderOrgUnitFactory, OrderParticipantFactory
- [x] Тесты: модели, сервисы, API — 66 тестов
- [x] OpenAPI: /api/docs/ (Swagger UI) и /api/redoc/ работают

**Неделя 4: React — Auth + Layout + API-клиент**
- [x] TypeScript-типы (ручные в api/types.ts, автогенерация доступна через `make types`)
- [x] Axios instance с JWT interceptor (auto-refresh на 401)
- [x] Zustand: useAuthStore (token, user, login, logout) + localStorage persistence
- [x] LoginPage (shadcn/ui: Card, Input, Button)
- [x] ProtectedRoute (redirect to login if no token)
- [x] AppLayout: Sidebar (навигация, collapsible), Header (профиль, тема, logout)
- [x] React Router: /login, /orders, /orders/:orderNumber, /directory/*, /profile
- [x] Общие компоненты: DataTable (TanStack Table + shadcn), OrgUnitCombobox, ConfirmDialog, EntityFormDialog
- [x] Тёмная/светлая тема (4 варианта: light, dark, orange-light, orange-dark)

**Неделя 5: React — Справочники**
- [x] OrgUnit — drill-down таблица с навигацией по иерархии (breadcrumb ancestors)
- [x] OrgUnit — визуализация в виде дерева (кастомный OrgUnitTreeView на shadcn Collapsible)
- [x] OrgUnit CRUD (EntityFormDialog с полной формой)
- [x] Справочник стран (ReferenceTablePage + CRUD)
- [x] Справочник контактов (DataTable + CRUD + привязка M2M к OrgUnit через OrgUnitCombobox)
- [x] Остальные справочники: Equipment, TypeOfWork, DeliveryType, Cities, Facilities
- [x] Bulk delete для всех справочников
- [x] Search/Filter на каждой таблице (debounced server-side search)

**Неделя 6: React — Заказы + Полировка**
- [x] OrderList — TanStack Table с фильтром по статусу, поиск, пагинация
- [x] OrderList — дополнительные фильтры (клиент, диапазон дат, fuzzy search с pg_trgm)
- [x] OrderDetail — карточка заказа с вкладками (Инфо, Контракт, Файлы, История)
- [x] OrderForm — создание/редактирование (React Hook Form + Zod)
  - [x] OrgUnitCombobox для выбора заказчика, посредника, проектировщика
  - [x] MultiSelect для оборудования, работ
  - [x] Выбор менеджеров (useUserList хук)
  - [x] Выбор контактов и участников ЦЗ
- [x] OrderHistory — timeline изменений (из simple_history)
- [x] Contract — секция в карточке заказа (inline edit, React Hook Form + Zod)
- [x] Загрузка файлов (upload, список, удаление) — отдельная вкладка
- [x] WebSocket: индикатор «кто просматривает заказ» (useOrderPresence + OrderDetailPage)
- [x] Финальные тесты frontend (Vitest): 55 тестов (useDebounce, useAuthStore, useUIStore, API client, ConfirmDialog, MultiSelect, useOrderPresence, useDirectoryQuery)
- [ ] **MVP-1 Ready** — деплой на staging (ожидает завершения Фазы 2-4)

### Фаза 2: Устройства + ТКП + Спецификации (8-10 недель)

> **Источники требований:** workflow.vsdx (процесс оформления заказа), ТЗ от сотрудника ОТМ, анализ legacy-системы «Маркетинг».
> **Примечание:** apps/devices/ (каталог устройств РЗА) уже реализован — DeviceRZA, ModRZA, Parameter (tree), ParameterValue, Components, ProductCategory (tree), Product, ProductAttribute, BOM. Остаётся реализовать apps/specs/ (ТКП и спецификации).

#### 2.1 Модели данных `apps/specs/`

**CommercialOffer (Технико-коммерческое предложение / КП):**
- `order` → FK(Order) — привязка к заказу
- `participant` → FK(OrderParticipant) — участник запроса (СВЭЛ, ЧЭМЗ и т.д.)
- `offer_number` (CharField, unique) — автонумерация: `{contract_number}/{participant_index}-{version}` (пример: `4070/1-1`, `4070/2-3`)
- `version` (PositiveIntegerField, default=1) — версия КП (при новом КП по тому же участнику: version+1)
- `date` (DateField, default=today) — дата КП, можно изменить вручную
- `valid_days` (PositiveIntegerField) — срок действия (14, 30, 60 дней — выпадающий список + ручной ввод)
- `valid_until` (DateField, computed) — date + valid_days
- `manager` → FK(User) — менеджер (привязка к ЛК), отображается в разделе «По вопросам обращаться»
- `executor` → FK(User) — исполнитель (кто оформляет КП)
- `status` (CharField) — draft / sent / accepted / rejected / expired
- `vat_rate` (DecimalField) — ставка НДС (0% / 20%, выпадающий список)
- `payment_terms` (CharField) — условия оплаты из предустановленных шаблонов:
  - `50_50`: 50% аванс, 50% перед отгрузкой
  - `100_post_7`: 100% в течение 7 дней после отгрузки
  - `100_post_30`: 100% в течение 30 дней после отгрузки
  - `custom`: произвольные условия
- `advance_percent` / `pre_shipment_percent` / `post_payment_percent` (DecimalField) — %, заполняется автоматически из шаблона или вручную при custom
- `manufacturing_period` (CharField) — срок изготовления: `30-60`, `60-90`, `90-120`, `120-150`, `150-180` (выпадающий список + произвольный ввод)
- `warranty_months` (PositiveIntegerField, default=60) — гарантия в месяцах (12, 36, 60 — выпадающий список)
- `delivery_included` (BooleanField, default=False) — доставка включена
- `delivery_city` (CharField, blank=True) — город доставки (если включена)
- `additional_conditions` (TextField, blank=True) — доп. условия (МЭК, соответствие ТЗ и прочее). Если пусто — не выводится в КП
- `is_template` (BooleanField, default=False) — типовое КП для участника (сохранение спец. условий)
- `based_on` → FK(self, nullable) — «заполнить на основании» другого КП
- history = HistoricalRecords()

**OfferWorkItem (Работы в КП):**
- `offer` → FK(CommercialOffer)
- `work_type` → FK(TypeOfWork) — вид работ (ШНР, ШМР, ПНР, СМР и др.)
- `included` (BooleanField, default=False) — включено / не включено
- `days` (PositiveIntegerField, default=15) — кол-во дней
- `specialists` (PositiveIntegerField, default=1) — кол-во специалистов
- `trips` (PositiveIntegerField, default=1) — кол-во выездов

**Specification (Спецификация к КП):**
- `offer` → OneToOne(CommercialOffer) — одна спецификация на КП
- `total_amount` (DecimalField, computed) — итоговая сумма
- `total_amount_with_vat` (DecimalField, computed) — итого с НДС
- history = HistoricalRecords()

**SpecificationLine (Позиция спецификации):**
- `specification` → FK(Specification)
- `line_number` (PositiveIntegerField) — порядковый номер (сквозная нумерация в КП)
- `product` → FK(Product, nullable) — позиция из каталога (может быть и ручной ввод)
- `device_rza` → FK(DeviceRZA, nullable) — устройство РЗА
- `mod_rza` → FK(ModRZA, nullable) — модификация
- `name` (CharField) — наименование (из Product.name или ручной ввод)
- `quantity` (PositiveIntegerField, default=1)
- `unit_price` (DecimalField) — цена за единицу
- `total_price` (DecimalField, computed) — quantity × unit_price
- `delivery_date` (DateField, nullable) — срок поставки позиции (по умолчанию = общий, но можно изменить для конкретной позиции — поддержка нескольких партий)
- `note` (TextField, blank=True) — примечание

**ParticipantContact (Контакты участника запроса):**
- `participant` → FK(OrderParticipant) — участник запроса
- `contact` → FK(Contact) — контактное лицо
- `is_primary` (BooleanField, default=False)
> Решает проблему: сейчас контакты привязаны к заказу целиком, а по ТЗ у каждого участника свои контактные лица.

#### 2.2 Сервисы `apps/specs/services/`

**offer_service.py:**
- `create_offer(order, participant, user)` — создание КП с автонумерацией
- `create_from_template(offer, participant)` — «заполнить на основании» другого КП (копирование условий, спецификации)
- `next_version(order, participant)` — вычисление следующей версии для участника
- `auto_number(offer)` — генерация номера `{contract}/{participant_index}-{version}`

**specification_service.py:**
- `fill_from_offer(specification, source_offer)` — заполнить спецификацию из другого КП
- `recalculate_totals(specification)` — пересчёт итогов
- `fill_from_products(specification, product_ids)` — заполнить из каталога продуктов

**document_service.py (генерация DOCX):**
- `generate_offer_docx(offer)` — генерация КП по шаблону (python-docx / docxtpl)
- `generate_specification_docx(specification)` — выгрузка спецификации по шаблону
- Шаблоны хранятся в `apps/specs/templates/docx/` (offer_template.docx, specification_template.docx)
- Подстановка данных: реквизиты участника, позиции спецификации, условия оплаты, работы, гарантия
- Пункт КП про оплату формируется автоматически: если 50/50 → «Срок отгрузки — в течение 10 рабочих дней после полной оплаты»; если с постоплатой → «...после уведомления о готовности»

#### 2.3 API `apps/specs/api/`

```
# ТКП
GET    /api/orders/{id}/offers/                    # Список КП по заказу (фильтр по участнику)
POST   /api/orders/{id}/offers/                    # Создать КП
GET    /api/offers/{id}/                           # Детали КП
PATCH  /api/offers/{id}/                           # Обновить КП
DELETE /api/offers/{id}/                           # Удалить КП
POST   /api/offers/{id}/copy/                      # Заполнить на основании (копия)
GET    /api/offers/{id}/export/                    # Выгрузка DOCX

# Спецификация
GET    /api/offers/{id}/specification/             # Получить спецификацию
PATCH  /api/offers/{id}/specification/             # Обновить позиции
POST   /api/offers/{id}/specification/fill/        # Заполнить из каталога / другого КП
GET    /api/offers/{id}/specification/export/      # Выгрузка спецификации DOCX

# Работы в КП
GET    /api/offers/{id}/works/                     # Список работ КП
PATCH  /api/offers/{id}/works/                     # Bulk-обновление работ

# Контакты участника
GET    /api/participants/{id}/contacts/            # Контакты участника
POST   /api/participants/{id}/contacts/            # Привязать контакт
DELETE /api/participants/{id}/contacts/{contact_id}/ # Отвязать контакт
```

#### 2.4 Frontend — React

**Неделя 7-8: Backend models + API + services + tests**
- [x] apps/devices/ — уже реализован
- [x] Модели: CommercialOffer, OfferWorkItem, Specification, SpecificationLine, ParticipantContact
- [x] Миграции
- [x] Сервисы: offer_service, specification_service
- [x] API: ViewSets, serializers, filters
- [x] Тесты: модели, сервисы, API — 5 файлов, 41 тест

**Неделя 9-10: Backend — генерация документов + доработки**
- [x] document_service.py — генерация DOCX (python-docx / docxtpl)
- [x] DOCX-шаблоны: КП, спецификация
- [x] Логика автоформирования текста условий оплаты и отгрузки
- [x] Доработка OrderParticipant: привязка контактов per-participant
- [x] Тесты генерации документов

**Неделя 11-12: Frontend — ТКП**
- [x] Вкладка «ТКП» в OrderDetailPage — список КП по участникам запроса (OffersTab)
- [x] Форма создания/редактирования КП (React Hook Form + Zod):
  - Выбор участника, менеджера, исполнителя
  - Условия оплаты (шаблоны + custom), НДС, срок изготовления, гарантия
  - Доставка (вкл/выкл + город)
  - Доп. условия (textarea)
- [x] Таблица работ в КП (OfferWorkItem): включено, вид, дни, специалисты, выезды (WorkItemsTable)
- [x] Кнопка «Заполнить на основании» — выбор источника КП (copy action)
- [x] Кнопка «Скачать DOCX» (specsApi.exportOffer)
- [x] Версионирование: список версий КП по участнику (offer_service.next_version)

**Неделя 13-14: Frontend — Спецификация**
- [x] Редактор спецификации (таблица позиций — SpecificationEditor):
  - Выбор из каталога Product / DeviceRZA / ModRZA или ручной ввод
  - Количество, цена, итого (auto-calculated)
  - Срок поставки per-позиция (несколько партий)
  - Drag-and-drop сортировка позиций
- [x] Кнопка «Заполнить из каталога» — выбор продуктов, авто-подстановка цен
- [x] Кнопка «Скачать спецификацию DOCX»
- [x] Итоги: сумма без НДС, НДС, итого с НДС
- [x] Контакты участника запроса — привязка ФИО к конкретному участнику (ParticipantContacts)
- [x] Расчёт (CalculationEditor) — добавлен сверх плана

#### 2.5 Доработки существующих модулей (в рамках Фазы 2)

**Order workflow — обход для гарантийных заказов:**
- [x] Добавить поле `Order.order_type` (choices: standard / warranty / niokr / replacement) — тип заказа
- [x] Для типов warranty/niokr/replacement — переход N→P без обязательного контракта (require_non_standard_order condition)
- [x] Соответствует workflow.vsdx: «если гарантийный ремонт, замены, НИОКР — сразу в производство» (TransitionDef N→P)

**Contract — шаблоны условий оплаты:**
- [x] Добавить поле `Contract.payment_template` (CharField, choices: 50_50, 100_post_7, 100_post_30, custom)
- [x] При выборе шаблона — автозаполнение advance/intermediate/post_payment процентов (handleTemplateChange)
- [x] Frontend: выпадающий список шаблонов в ContractSection (TEMPLATE_PRESETS)

### Фаза 3: Коммерческая информация + Документы (3-4 недели)

> **Источник:** ТЗ от сотрудника ОТМ — разделы «Коммерческая информация», «Документация», «Исходящие».

#### 3.1 Категоризация файлов заказа

**Доработка OrderFile:**
- [x] Добавить поле `category` (choices: general / incoming / outgoing / contract / specification / letter / rkd / other)
- [x] Добавить поле `description` (CharField, blank=True) — краткое описание
- [x] Frontend: фильтр по категории (входящие / исходящие / все) — OrderFilesSection

#### 3.2 Генерация типовых документов

**DocumentTemplate модель:**
- [x] `name` (CharField) — название шаблона
- [x] `template_file` (FileField) — DOCX-шаблон с плейсхолдерами
- [x] `document_type` (CharField) — тип документа
- [x] `entity` (CharField) — какой компании принадлежит шаблон (НПП / ЧАК / Технопарк) — CompanyEntity choices

**API:**
```
GET    /api/document-templates/                    # Список шаблонов
POST   /api/orders/{id}/generate-document/         # Генерация документа по шаблону
         body: { template_id, extra_data: { dates, amounts, ... } }
```

**Frontend:**
- [x] Кнопка «Сформировать документ» в карточке заказа → выбор шаблона → заполнение полей → скачать DOCX (GenerateDocumentDialog)
- [x] Выбор предприятия (НПП, ЧАК, Технопарк) — бланк и реквизиты подставляются автоматически

#### 3.3 Выгрузка референса

- [x] Новый отчёт `reference_export` — список отгруженных заказов с группировкой по оборудованию (ReferenceExportReport)
- [x] Фильтры: период отгрузки, заказчик (по умолчанию все), оборудование
- [x] Группировка оборудования по кодам 01X7: РЗА 6-35, РЗА 110-220, РЗА 330+, ДГР, Генерация, ПА, РАС, ОМП, НКУ, АСУ ТП
- [x] Экспорт в Excel
- [x] К выгрузке принимаются только заказы со статусом «Отгружен» (S)

#### 3.4 Несколько партий отгрузки

- [x] Новая модель `ShipmentBatch`: order→FK, batch_number, ship_date, description
- [x] Привязка позиций спецификации к партиям (SpecificationLine → ShipmentBatch)
- [x] В карточке заказа: вкладка «Отгрузки» — список партий с датами (ShipmentsTab)

### Фаза 4: ЛК Менеджера + ЛК Руководителя (2-3 недели)

> **Источник:** ТЗ от сотрудника ОТМ — разделы «ЛК Менеджера», «ЛК Руководителя».

#### 4.1 ЛК Менеджера (расширение ProfilePage)

**Backend:**
- [x] Привязка «Мои заказчики» к менеджеру: M2M `User.my_customers` → OrgUnit
- [x] API: `GET /api/users/me/customers/` — мои заказчики
- [x] API: `GET /api/users/me/orders/` — мои заказы с расширенными фильтрами
- [x] API: `GET /api/users/me/offers/` — мои КП (MyOffersView, фильтр manager=request.user)
- [x] API: `GET /api/users/me/stats/` — персональная статистика (включая конверсию КП)

**Frontend — ProfilePage (расширение существующего):**
- [x] Вкладка «Мои заказчики» — список организаций с кнопкой «Добавить»
- [x] Вкладка «Мои заказы» — три подвкладки:
  - КП (список коммерческих предложений менеджера)
  - Текущие (заказы в статусах N, D, P, C) — с датой отгрузки / планируемой датой
  - Отгруженные (статус S) — с суммой договора, статусом оплаты
- [~] Группировка по годам — реализована как таблица в MyStatsTab (by_year), но не сворачиваемые секции в списке заказов
- [x] При клике на заказ → открывается карточка заказа
- [x] Вкладка «Статистика» (MyStatsTab):
  - [x] Кол-во реализованных заказов из выданных КП (конверсия) — _get_manager_stats()
  - [x] Разбивка по годам
  - [x] Моя доля в реализованных проектах компании — my_share в _get_manager_stats()
  - [x] Основные заказчики (топ-5 по кол-ву заказов) — top_customers
  - [x] Основное оборудование (топ-5) — top_equipment

#### 4.2 ЛК Руководителя

**Backend:**
- [x] API: `GET /api/users/{id}/orders/` — заказы конкретного менеджера
- [x] API: `GET /api/users/{id}/stats/` — статистика менеджера
- [x] API: `GET /api/reports/team-performance/` — сводный отчёт по команде

**Frontend — ManagerDashboard (страница /manager-dashboard):**
- [x] Выбор менеджера из списка (для руководителя)
- [x] Та же информация, что в ЛК менеджера, но по выбранному сотруднику
- [x] Сводная таблица: все менеджеры, кол-во заказов, сумма
- [x] У руководителя — также свои заказчики (как у менеджера) — MyCustomersSection в ManagerDashboard

### Фаза 5: ЭДО + Миграция данных (3-4 недели)

> **Примечание:** Модуль ЭДО (apps/edo/) разрабатывается отдельным разработчиком на аналогичном стеке (Django + DRF + React). Код будет интегрирован в данный проект. Legacy-модуль: `/home/serj/PyCharm/Projects/marketing` (модуль edo).

**Неделя 19-20:** ~~Интеграция apps/edo/~~ — ✅ Интегрирован (4 под-приложения: doc_builder, parser_app, templates_app, registry; 45 файлов frontend)
**Неделя 21-22:** Скрипты миграции данных из старой PostgreSQL → новая. Mapping таблиц, трансформации, верификация. (скрипт в legacy-проекте, требуется полировка)

### Фаза 6: Закупки (4-6 недель)

> **Источник:** ТЗ от сотрудника ОТМ — разделы «Закупки», workflow.vsdx (проверка комплектующих на складе, дефицит → закупки).
> **Зависимость:** Требуется уточнение у отдела закупок (Поливцев А.) и складского учёта (Казаков А.) по текущим процессам и интеграции с 1С.

#### 6.1 Складской учёт (базовый)

**Модели:**
- [x] `StockItem` — позиция на складе: product→OneToOne(Product), quantity, reserved, available (computed)
- [x] `StockMovement` — движение: stock_item→FK, movement_type (receipt/issue/reserve/unreserve), quantity, order→FK(Order, nullable), user→FK, created_at, comment
- [x] `StockReservation` — бронирование: stock_item→FK, order→FK, quantity, reserved_by→FK(User), comment, created_at

**Сервисы:**
- [x] `stock_service.py` — receive_stock, issue_stock, reserve_stock, unreserve_stock (атомарные операции с F-expressions)

**API:**
```
GET    /api/purchasing/stock/                       # Остатки на текущую дату
GET    /api/purchasing/stock/{id}/movements/        # История движений
POST   /api/purchasing/stock/{id}/reserve/          # Забронировать для заказа
POST   /api/purchasing/stock/{id}/unreserve/        # Снять бронь
POST   /api/purchasing/stock/{id}/receive/          # Приход на склад
```

**Тесты:** 41 тест (модели + сервисы + API) — все проходят

**Frontend:**
- [x] Страница «Склад» (StockPage) — таблица остатков, деталь с историей движений, приход со склада
- [ ] При оформлении закупки — подсказка «можно забрать со склада» (stock_available в PurchaseRequestLine)

#### 6.2 Заявки на закупку

**Модели:**
- [x] `PurchaseRequest` — заявка: order→FK, created_by→FK(User), status (draft/submitted/in_progress/completed/cancelled), required_date, note
- [x] `PurchaseRequestLine` — позиция заявки: request→FK, product→FK, name, quantity, target_description, note; stock_available (computed from StockItem)

**Сервисы:**
- [x] `purchasing_service.py` — submit_request, create_order_from_request (автосоздание PO из заявки)

**Workflow:**
- [x] Тех. специалист создаёт заявку → submit → закупщики видят → подсказка stock_available → create_order_from_request

**Frontend:**
- [x] Страница «Заявки на закупку» (PurchaseRequestsPage) — список с фильтрами, подача, деталь с позициями + подсказка stock_available

#### 6.3 Общая база закупок

**Модели:**
- [x] `PurchaseOrder` — закупочный ордер: supplier→FK(OrgUnit, supplier), order→FK, purchase_request→FK, purchaser→FK(User), status (draft/ordered/partial/delivered/cancelled), order_date, expected_date, note; history tracking
- [x] `PurchaseOrderLine` — позиция: purchase_order→FK, product→FK, name, quantity, unit_price, total_price (auto), delivery_date, delivered_quantity, note
- [x] `PurchaseOrderFile` — файлы к закупке (счета, накладные)
- [x] `SupplierConditions` — условия поставщика: supplier→OneToOne(OrgUnit), discount_percent, payment_terms, delivery_terms, notes

**API:**
- [x] CRUD для PurchaseOrder, PurchaseOrderLine, SupplierConditions
- [x] MetadataMixin + ExportMixin на PurchaseOrderViewSet
- [x] Фильтры: supplier, order, status, purchaser, date_from/date_to
- [x] Upload файлов к закупке

**Frontend:**
- [x] Реестр закупок (PurchaseOrdersPage) — таблица с фильтрами по статусу, поиск, создание через OrgUnitCombobox
- [x] Карточка закупки — позиции, оплаты (с согласованием), файлы, tabs
- [x] Выгрузка Excel (кнопка в реестре)
- [x] Карточка поставщика (SupplierPage) — список, условия (скидка, оплата, доставка, примечания), inline-редактирование, история закупок

#### 6.4 Оплата закупок

**Модели:**
- [x] `PurchasePayment` — оплата: purchase_order→FK, amount, payment_date, due_date, status (pending_approval/approved/paid/rejected), approved_by→FK(User), invoice_file, invoice_number, note

**Сервисы:**
- [x] approve_payment, reject_payment, mark_payment_paid (workflow согласования)

**API:**
- [x] CRUD + approve/reject/mark-paid actions + pending (список на согласовании)

**Workflow:**
- [x] Закупщик добавляет счёт → pending_approval → руководитель approve/reject → mark_paid
- [x] Для постоплаты: напоминание при наступлении due_date (check_payment_deadlines Celery task, ежедневно)

**Frontend:**
- [x] UI оплаты в карточке закупки (вкладка «Оплаты» в PurchaseOrderDetailDialog)
- [x] Страница «Оплаты» (PaymentsPage) — таблица + выделенный блок «На согласовании» с кнопками Согласовать/Отклонить

#### 6.5 ЛК Руководителя отдела закупок

- [x] Закупочные цены на позиции за период — avg_prices в PurchasingDashboard
- [x] Закупки по месяцам (прогноз-график) — by_month таблица с фильтром по годам
- [x] Доля основного поставщика — supplier_share в PurchasingDashboard
- [x] Раздел «На оплату» — pending_payments в summary + PaymentsPage с блоком «На согласовании»

> **Открытые вопросы (требуют уточнения):**
> - Интеграция с 1С: можно ли выгружать/загружать данные? Какой формат обмена?
> - Текущий процесс ведения базы закупок (уточнить у Казакова А.)
> - Объём складского учёта: полноценный WMS или базовый учёт остатков?

### Фаза 7: Production + Деплой (2-3 недели)

**Неделя 25-26:** Деплой на production, переключение пользователей
**Неделя 27:** Оптимизация, мониторинг, документация

---

## 7. Миграция данных (стратегия)

```
Этап 1: Маппинг схем
  old.Customer + old.Affiliate + old.Division + old.Object → new.OrgUnit (дерево)
  old.Order → new.Order (с пересвязкой FK на новые OrgUnit)
  old.Contract → new.Contract

Этап 2: Скрипт миграции (management command)
  python manage.py migrate_from_legacy --source-db=old_marketing

Этап 3: Верификация
  Сравнение количества записей
  Spot-check случайных записей
  Проверка целостности связей

Этап 4: Переключение
  Старая система → read-only
  Новая система → production
```

---

## 8. Ключевые архитектурные решения

| Решение | Обоснование |
|---|---|
| **Модульный монолит** | 2 разработчика, единый деплой, возможность выделить сервис позже |
| **Service layer** | Бизнес-логика в services/, не во views — тестируемость, переиспользуемость |
| **Selectors pattern** | Сложные запросы в selectors/ — views остаются тонкими |
| **JWT + LDAP** | Stateless auth для SPA, корпоративная аутентификация |
| **drf-spectacular** | Автогенерация OpenAPI → автогенерация TypeScript-типов |
| **Единый OrgUnit** | Все компании (заказчики, посредники, проектировщики и др.) хранятся в OrgUnit, роль определяется через business_role |
| **simple_history** | Аудит на Order, Contract, OrgUnit, все справочники, devices — полное покрытие |
| **docxtpl для DOCX** | Генерация КП и спецификаций по шаблонам, гибче чем python-docx |
| **КП-версионирование** | Версия КП привязана к паре (заказ, участник), авто-инкремент при новом КП |
| **treebeard MP_Node** | OrgUnit, ProductCategory, Parameter — проверенное решение |
| **TanStack Table** | Замена jQuery DataTables — серверная пагинация, сортировка, фильтры |
| **Zustand (не Redux)** | Простой, минимальный boilerplate, достаточен для ERP |
| **React Hook Form + Zod** | Type-safe формы с валидацией, интеграция с shadcn/ui |

---

## 9. Верификация

После каждой недели:
1. `make lint` — ruff + mypy (backend), eslint + tsc (frontend)
2. `make test` — pytest --cov ≥80% (backend), vitest (frontend)
3. `docker compose up` — проверка в Docker-окружении (dev)
4. `/api/docs/` — OpenAPI-схема валидна и полна
5. Ручное тестирование в браузере (React UI)

MVP-1 acceptance criteria:
- [x] Авторизация через JWT (login, refresh, protected routes)
- [x] CRUD для всех справочников (OrgUnit, Countries, Cities, Contacts, Facilities, Equipment, TypeOfWork, DeliveryType)
- [x] CRUD для заказов (создание, редактирование, список, фильтры, история) — доработка формы в процессе
- [x] Контракты (создание/редактирование в карточке заказа)
- [x] Загрузка файлов к заказу
- [x] WebSocket: индикация активных пользователей на заказе (useOrderPresence + badges в OrderDetailPage)
- [x] Backend: тесты ≥80% покрытия (CI настроен на --cov-fail-under=80)
- [x] Docker: `docker compose up` (dev) и `docker compose -f docker-compose.prod.yml build` (prod) работают
- [x] CI: pipeline проходит (lint + test + build + deploy)

---

## 10. Первый шаг реализации

Начинаем с **Недели 1**: скаффолдинг проекта. Создаём структуру директорий, настраиваем Django, Docker, CI/CD, модуль users с JWT-аутентификацией, и базовый React-проект.
