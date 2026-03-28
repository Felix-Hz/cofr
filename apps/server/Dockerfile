# Rust build stage - compile scribe PyO3 extension
FROM rust:1.88-slim AS rust-builder

WORKDIR /build

# Install Python headers (needed for PyO3 compilation)
RUN apt-get update && apt-get install -y python3-dev python3-pip && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install maturin --break-system-packages

# Copy Rust crate source (passed via additional_contexts in docker-compose)
COPY --from=scribe . ./scribe/

# Build the wheel
RUN cd scribe && maturin build --release --strip --out /dist

# Python build stage
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Keep the virtualenv outside /app so bind mounts can't shadow or preserve stale environments.
RUN uv venv /opt/venv
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --active --no-dev

# Install the Rust extension wheel
COPY --from=rust-builder /dist/*.whl /tmp/
RUN uv pip install --python /opt/venv/bin/python /tmp/*.whl && rm -f /tmp/*.whl

# Runtime stage
FROM python:3.12-slim

# Install libpq for psycopg2 runtime
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy virtual environment and app code
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini ./

# Switch to non-root user
USER appuser

# Add venv to PATH
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Expose port
EXPOSE 5784

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5784/health')"

# Run migrations then start the application
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 5784"]
