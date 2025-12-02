# Bezorgen

```javascript
//  _
// | |__   ___ _______  _ __ __ _  ___ _ __
// | '_ \ / _ \_  / _ \| '__/ _` |/ _ \ '_ \
// | |_) |  __// / (_) | | | (_| |  __/ | | |
// |_.__/ \___/___\___/|_|  \__, |\___|_| |_|
//                          |___/
```

Expense Dashboard API - FastAPI backend serving expense data from Turso with Telegram authentication.

## Quick Start

```bash
# Setup
uv sync
cp .env.example .env
# Edit .env with your credentials

# Run development server
uv run uvicorn app.main:app --reload --port 5784

# See API documentation
open http://localhost:5784/docs

# Visit http://localhost:5784/docs for API documentation
```

## Deploy to Raspberry Pi

```bash
./deploy.sh
# Enter your Pi's IP address when prompted
```

## Documentation

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for complete implementation guide.

## Tech Stack

- **FastAPI** - Async Python web framework
- **SQLAlchemy 2.0** - Async ORM
- **Turso** - Edge SQLite database
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
