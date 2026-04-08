# ── Base stage ──────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-rus \
    && rm -rf /var/lib/apt/lists/*

# ── Dev target ─────────────────────────────────────────────
FROM base AS dev

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

# Code is mounted via volume in docker-compose, not copied
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── Prod target ────────────────────────────────────────────
FROM base AS prod

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/production.txt \
    && rm -rf requirements/

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
