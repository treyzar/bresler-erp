# ── Base stage: runtime system libraries ────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libldap-2.5-0 \
    libsasl2-2 \
    tesseract-ocr \
    tesseract-ocr-rus \
    && rm -rf /var/lib/apt/lists/*

# ── Builder stage: adds compilers for building Python wheels ─
FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libldap2-dev \
    libsasl2-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Dev target ──────────────────────────────────────────────
FROM builder AS dev

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── Prod builder: compiles all prod packages ────────────────
FROM builder AS prod-builder

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/production.txt

# ── Prod target: thin runtime image ─────────────────────────
FROM base AS prod

COPY --from=prod-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=prod-builder /usr/local/bin /usr/local/bin

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
