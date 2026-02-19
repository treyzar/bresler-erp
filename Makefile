.PHONY: dev test lint migrate shell format backend frontend docker-up docker-down

# Development
dev:
	docker compose -f docker-compose.dev.yml up --build

docker-up:
	docker compose -f docker-compose.dev.yml up -d

docker-down:
	docker compose -f docker-compose.dev.yml down

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

# Database
migrate:
	cd backend && python manage.py migrate

makemigrations:
	cd backend && python manage.py makemigrations

createsuperuser:
	cd backend && python manage.py createsuperuser

shell:
	cd backend && python manage.py shell_plus

# Testing
test:
	cd backend && pytest --cov=apps --cov-report=term-missing
	cd frontend && npm run test -- --run

test-backend:
	cd backend && pytest --cov=apps --cov-report=term-missing -v

test-frontend:
	cd frontend && npm run test -- --run

# Linting
lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npx tsc --noEmit

lint-fix:
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run lint -- --fix

format:
	cd backend && ruff format .

# OpenAPI
schema:
	cd backend && python manage.py spectacular --color --file schema.yml

types:
	cd frontend && npx openapi-typescript http://localhost:8000/api/schema/ -o src/api/types.ts
