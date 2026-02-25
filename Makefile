.PHONY: dev test lint migrate shell format backend frontend docker-up docker-down \
       prod prod-build prod-down prod-logs prod-restart prod-migrate prod-shell prod-createsuperuser

# ── Development ────────────────────────────────────────────
dev:
	docker compose up --build -V

docker-up:
	docker compose up -d

docker-down:
	docker compose down

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

# ── Database ───────────────────────────────────────────────
migrate:
	cd backend && python manage.py migrate

makemigrations:
	cd backend && python manage.py makemigrations

createsuperuser:
	cd backend && python manage.py createsuperuser

shell:
	cd backend && python manage.py shell_plus

# ── Testing ────────────────────────────────────────────────
test:
	cd backend && pytest --cov=apps --cov-report=term-missing
	cd frontend && npm run test -- --run

test-backend:
	cd backend && pytest --cov=apps --cov-report=term-missing -v

test-frontend:
	cd frontend && npm run test -- --run

# ── Linting ────────────────────────────────────────────────
lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npx tsc --noEmit

lint-fix:
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run lint -- --fix

format:
	cd backend && ruff format .

# ── OpenAPI ────────────────────────────────────────────────
schema:
	cd backend && python manage.py spectacular --color --file schema.yml

types:
	cd frontend && npx openapi-typescript http://localhost:8000/api/schema/ -o src/api/types.ts

# ── Production ─────────────────────────────────────────────
prod:
	docker compose -f docker-compose.prod.yml up -d

prod-build:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-restart:
	docker compose -f docker-compose.prod.yml restart

prod-migrate:
	docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

prod-shell:
	docker compose -f docker-compose.prod.yml exec backend python manage.py shell_plus

prod-createsuperuser:
	docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
