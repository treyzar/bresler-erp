#!/bin/bash
set -e

# ── Wait for PostgreSQL ───────────────────────────────────
echo "Waiting for PostgreSQL..."
python << 'EOF'
import socket, time, os
host = os.environ.get("POSTGRES_HOST", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
for i in range(30):
    try:
        sock = socket.create_connection((host, port), timeout=2)
        sock.close()
        break
    except OSError:
        time.sleep(1)
else:
    raise RuntimeError(f"PostgreSQL at {host}:{port} not available after 30s")
EOF
echo "PostgreSQL is ready."

# ── Wait for Redis ─────────────────────────────────────────
echo "Waiting for Redis..."
python << 'EOF'
import socket, time, os
host = os.environ.get("REDIS_HOST", "redis")
for i in range(30):
    try:
        sock = socket.create_connection((host, 6379), timeout=2)
        sock.close()
        break
    except OSError:
        time.sleep(1)
else:
    raise RuntimeError(f"Redis at {host}:6379 not available after 30s")
EOF
echo "Redis is ready."

# ── Command dispatch ───────────────────────────────────────
case "$1" in
  gunicorn)
    echo "Running migrations..."
    python manage.py migrate --noinput
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
    echo "Starting gunicorn..."
    exec gunicorn config.wsgi:application \
      --bind 0.0.0.0:8000 \
      --workers "${GUNICORN_WORKERS:-4}"
    ;;
  daphne)
    echo "Starting daphne..."
    exec daphne -b 0.0.0.0 -p 8001 config.asgi:application
    ;;
  celery-worker)
    echo "Starting celery worker..."
    exec celery -A config worker -l info
    ;;
  celery-beat)
    echo "Starting celery beat..."
    exec celery -A config beat -l info
    ;;
  *)
    exec "$@"
    ;;
esac
