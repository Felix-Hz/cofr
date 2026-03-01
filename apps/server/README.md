# Cofr — Server

Expense Dashboard API — FastAPI backend serving expense data from PostgreSQL with OAuth and Telegram authentication.

## Quick Start

```bash
# Setup
uv sync
cp .env.example .env

# NOTE: Edit .env with your credentials

# Run development server
uv run uvicorn app.main:app --reload --port 5784

# Visit http://localhost:5784/docs for API documentation
```

## Tech Stack

- **FastAPI** - Python web framework
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL** - Database
- **uv** - Fast package manager
- **Ruff** - Fast linting/formatting
- **Docker** - Containerization

## Development

```bash
# Lint
uv run ruff check .

# Format
uv run ruff format .

# Test
uv run pytest

# Build Docker image
docker build -t expense-api:latest .
```
