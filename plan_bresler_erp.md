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
│   │   │   │   └── references.py  # Equipment, TypeOfWork, DeliveryType, Intermediary, Designer, PQ
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
│   │   └── edo/                   # (Фаза 3) Электронный документооборот
│   │
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   ├── production.txt
│   │   └── test.txt
│   ├── manage.py
│   ├── pytest.ini
│   ├── pyproject.toml             # ruff, mypy config
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # Автогенерированные типы из OpenAPI
│   │   │   ├── client.ts          # Axios instance + JWT interceptor
│   │   │   ├── types.ts           # Сгенерированные из OpenAPI
│   │   │   └── hooks/             # useOrders(), useDirectory() etc.
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui компоненты
│   │   │   ├── layout/            # AppLayout, Sidebar, Header, Breadcrumbs
│   │   │   └── shared/            # DataTable, TreeView, SearchCombobox, FileUpload
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
│   └── Dockerfile
│
├── docker/
│   ├── nginx/
│   │   └── default.conf           # SPA + API proxy + WebSocket
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml             # Production
├── docker-compose.dev.yml         # Development (hot-reload)
├── .gitlab-ci.yml
├── Makefile                       # make dev, make test, make migrate, make lint
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
- `Intermediary(BaseModel)` — name
- `Designer(BaseModel)` — name
- `PQ(BaseModel)` — name, full_name, previous_names (JSONField), History

### 2.4 orders/models/ — Заказы

**order.py:**
- `Order(BaseModel)` — order_number (unique, auto-increment), tender_number, status (N/P/C/T/A), note, start_date, ship_date
  - FK: customer_org_unit→OrgUnit, intermediary→Intermediary, designer→Designer, country→Country
  - M2M: org_units (through OrderOrgUnit with role), contacts, managers→User, equipments, works, pqs (through OrderPQ with order_index), files→OrderFile, related_orders→self
  - History: simple_history с M2M tracking

- `OrderOrgUnit` (through) — order→FK, org_unit→FK, role, order_index, note. Unique: (order, org_unit, role)

- `OrderPQ` (through) — order→FK, pq→FK, order_index

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
# delivery-types, intermediaries, designers, pqs):
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

### docker-compose.dev.yml
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bresler_erp
      POSTGRES_USER: bresler
      POSTGRES_PASSWORD: bresler_dev
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes: [./backend:/app]
    ports: ["8000:8000"]
    env_file: ./backend/.env
    depends_on: [db, redis]

  frontend:
    build: ./frontend
    command: npm run dev -- --host 0.0.0.0
    volumes: [./frontend:/app, /app/node_modules]
    ports: ["5173:5173"]
    depends_on: [backend]

  celery:
    build: ./backend
    command: celery -A config worker -l info
    volumes: [./backend:/app]
    env_file: ./backend/.env
    depends_on: [db, redis]

volumes:
  postgres_data:
```

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
- [ ] Создать `/home/serj/PyCharm/Projects/bresler-erp/`
- [ ] Инициализировать git-репозиторий
- [ ] Backend: `django-admin startproject config .`
- [ ] Структура settings/ (base, development, production, test)
- [ ] Установить зависимости: Django 5.2, DRF, simplejwt, drf-spectacular, cors-headers, simple-history, treebeard, django-filter, celery, channels, redis
- [ ] Создать apps/core/ (BaseModel, pagination, permissions, exceptions)
- [ ] Создать apps/users/ (User model, JWT auth endpoints, /api/users/me/)
- [ ] Docker: docker-compose.dev.yml (PostgreSQL 16, Redis 7, backend)
- [ ] pytest.ini, conftest.py, UserFactory
- [ ] Тесты: auth endpoints (login, refresh, me)
- [ ] pyproject.toml: ruff + mypy config
- [ ] Makefile: dev, test, migrate, lint, shell
- [ ] Frontend: `npm create vite@latest frontend -- --template react-ts`
- [ ] Установить: tailwindcss, shadcn/ui init, react-router, axios, tanstack-query, zustand
- [ ] .gitlab-ci.yml: lint + test stages
- [ ] README.md с инструкцией запуска

**Неделя 2: Модуль Directory (backend)**
- [ ] Создать apps/directory/ с моделями: Country, City, OrgUnit, Contact, Equipment, TypeOfWork, DeliveryType, Intermediary, Designer, PQ
- [ ] Миграции
- [ ] Сервисы: orgunit_service.py (tree ops), directory_service.py (CRUD + previous_names)
- [ ] Сигналы: previous_names tracking (pre_save)
- [ ] API: ViewSets для всех справочников
- [ ] API: OrgUnit tree endpoints (children, ancestors, tree, search)
- [ ] API: Filters (search by name, filter by parent/country)
- [ ] Admin: TreeAdmin для OrgUnit, ModelAdmin для остальных
- [ ] Фабрики: CountryFactory, OrgUnitFactory, ContactFactory и т.д.
- [ ] Тесты: модели, сервисы, API (CRUD + tree ops)
- [ ] OpenAPI: проверить схему через /api/docs/

**Неделя 3: Модуль Orders (backend)**
- [ ] Создать apps/orders/ с моделями: Order, OrderOrgUnit, OrderPQ, Contract, OrderFile
- [ ] Миграции
- [ ] Сервисы: order_service.py (create, update, next_number), contract_service.py
- [ ] API: OrderViewSet (list, create, retrieve, update, history, files)
- [ ] API: ContractViewSet (get/update через order endpoint)
- [ ] API: Filters (status, customer, date range, search)
- [ ] WebSocket: OrderPresenceConsumer + routing
- [ ] Admin: OrderAdmin с inlines
- [ ] Фабрики: OrderFactory, ContractFactory
- [ ] Тесты: модели, сервисы, API
- [ ] OpenAPI: проверить полную схему

**Неделя 4: React — Auth + Layout + API-клиент**
- [ ] Сгенерировать TypeScript-типы из OpenAPI: `npx openapi-typescript`
- [ ] Axios instance с JWT interceptor (auto-refresh)
- [ ] Zustand: useAuthStore (token, user, login, logout)
- [ ] LoginPage (shadcn/ui: Card, Input, Button, Form)
- [ ] ProtectedRoute (redirect to login if no token)
- [ ] AppLayout: Sidebar (навигация), Header (профиль, logout), Breadcrumbs
- [ ] React Router: /login, /orders, /orders/:id, /directory/*, /profile
- [ ] Общие компоненты: DataTable (TanStack Table + shadcn), SearchCombobox, ConfirmDialog
- [ ] Тёмная/светлая тема (shadcn/ui theme)

**Неделя 5: React — Справочники**
- [ ] OrgUnitTree — react-arborist или кастомный tree на shadcn
- [ ] OrgUnit CRUD (Sheet/Dialog формы)
- [ ] Справочник стран (DataTable + CRUD)
- [ ] Справочник контактов (DataTable + CRUD + привязка к OrgUnit)
- [ ] Остальные справочники: Equipment, TypeOfWork, Intermediary, Designer, PQ
- [ ] Bulk delete для всех справочников
- [ ] Search/Filter на каждой таблице

**Неделя 6: React — Заказы + Полировка**
- [ ] OrderList — TanStack Table с фильтрами (статус, клиент, даты), поиск
- [ ] OrderDetail — полная карточка заказа (read + edit mode)
- [ ] OrderForm — создание/редактирование (React Hook Form + Zod)
  - Combobox для выбора OrgUnit, клиента, менеджера
  - MultiSelect для оборудования, работ, ПКЗ
  - File upload
- [ ] OrderHistory — timeline изменений (из simple_history)
- [ ] Contract — секция в карточке заказа (inline edit)
- [ ] WebSocket: индикатор «кто просматривает заказ»
- [ ] Финальные тесты, lint, code review
- [ ] **MVP-1 Ready** — деплой на staging

### Фаза 2: Устройства + Спецификации + ТКП (4-5 недель)

**Неделя 7-8:** apps/devices/ — DeviceRZA, ModRZA, Parameter (tree), ParameterValue, Components, ProductCategory (tree), Product, ProductAttribute
**Неделя 9-10:** apps/specs/ — Specification, DeviceInSpecification, TechnicalCommercialOffer. Генерация DOCX.
**Неделя 11:** React: каталог терминалов, конфигуратор ТКП, экспорт документов

### Фаза 3: ЭДО + Миграция данных (3-4 недели)

**Неделя 12:** apps/edo/ — Document, DocumentFile, DRF ViewSets
**Неделя 13:** React: модуль ЭДО
**Неделя 14-15:** Скрипты миграции данных из старой PostgreSQL → новая. Mapping таблиц, трансформации, верификация.

### Фаза 4: Production + Аналитика (2-3 недели)

**Неделя 16:** Деплой на production, переключение пользователей
**Неделя 17:** Дашборды аналитики (React + Recharts)
**Неделя 18:** Оптимизация, мониторинг, документация

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
| **simple_history** | Аудит на Order, Contract, OrgUnit, PQ — как в старой системе |
| **treebeard MP_Node** | OrgUnit, ProductCategory, Parameter — проверенное решение |
| **TanStack Table** | Замена jQuery DataTables — серверная пагинация, сортировка, фильтры |
| **Zustand (не Redux)** | Простой, минимальный boilerplate, достаточен для ERP |
| **React Hook Form + Zod** | Type-safe формы с валидацией, интеграция с shadcn/ui |

---

## 9. Верификация

После каждой недели:
1. `make lint` — ruff + mypy (backend), eslint + tsc (frontend)
2. `make test` — pytest --cov ≥80% (backend), vitest (frontend)
3. `docker-compose up` — проверка в Docker-окружении
4. `/api/docs/` — OpenAPI-схема валидна и полна
5. Ручное тестирование в браузере (React UI)

MVP-1 acceptance criteria:
- [ ] Авторизация через JWT (login, refresh, protected routes)
- [ ] CRUD для всех справочников (OrgUnit tree, Countries, Contacts, etc.)
- [ ] CRUD для заказов (создание, редактирование, список, фильтры, история)
- [ ] Контракты (создание/редактирование в карточке заказа)
- [ ] Загрузка файлов к заказу
- [ ] WebSocket: индикация активных пользователей на заказе
- [ ] Backend: тесты ≥80% покрытия
- [ ] Docker: `docker-compose up` запускает всё окружение
- [ ] CI: pipeline проходит (lint + test + build)

---

## 10. Первый шаг реализации

Начинаем с **Недели 1**: скаффолдинг проекта. Создаём структуру директорий, настраиваем Django, Docker, CI/CD, модуль users с JWT-аутентификацией, и базовый React-проект.
