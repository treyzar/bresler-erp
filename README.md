# Bresler ERP

ERP-система для управления заказами, справочниками и контрактами.

## Технологии

- **Backend:** Django 5.2, Django REST Framework, PostgreSQL 16, Redis 7, Celery
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Инфраструктура:** Docker, Nginx, GitLab CI/CD

## Быстрый старт

### С Docker (рекомендуется)

```bash
# Скопировать .env
cp backend/.env.example backend/.env

# Запустить все сервисы
make dev
```

Backend: http://localhost:8000
Frontend: http://localhost:5173
API docs: http://localhost:8000/api/docs/
Admin: http://localhost:8000/admin/

### Без Docker

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements/development.txt

# Настроить .env
cp .env.example .env

# Миграции и суперпользователь
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Полезные команды

```bash
make test           # Запустить все тесты
make test-backend   # Только backend тесты
make test-frontend  # Только frontend тесты
make lint           # Проверка линтером
make lint-fix       # Автоисправление
make migrate        # Применить миграции
make shell          # Django shell
make schema         # Сгенерировать OpenAPI-схему
make types          # Сгенерировать TypeScript-типы из OpenAPI
```

## Структура проекта

```
bresler-erp/
├── backend/          # Django API
│   ├── config/       # Настройки проекта
│   ├── apps/
│   │   ├── core/     # Базовые компоненты
│   │   ├── users/    # Пользователи и аутентификация
│   │   ├── directory/ # Справочники и оргструктура
│   │   └── orders/   # Заказы и контракты
│   └── requirements/
├── frontend/         # React SPA
│   └── src/
├── docker/           # Конфигурации Docker
└── docker-compose.dev.yml
```

## API

Документация API доступна после запуска:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/
