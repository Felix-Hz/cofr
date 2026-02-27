#!/bin/bash
set -e

echo "=== Starting Cofr Dashboard (Local Dev) ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# Check environment files
if [ ! -f "apps/server/.env" ]; then
    echo "Error: apps/server/.env not found"
    echo "Copy apps/server/.env.example to apps/server/.env and fill in your values"
    exit 1
fi

if [ ! -f "apps/client/.env" ]; then
    echo "Error: apps/client/.env not found"
    echo "Copy apps/client/.env.example to apps/client/.env and fill in your values"
    exit 1
fi

if [ ! -f "apps/tg-bot/.env" ]; then
    echo "Error: apps/tg-bot/.env not found"
    echo "Create apps/tg-bot/.env with the required environment variables"
    exit 1
fi

# Update client .env for local development
echo "Updating client .env for local development..."
if grep -q "VITE_API_BASE_URL" apps/client/.env; then
    sed -i.bak 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:8080/api|' apps/client/.env
    rm -f apps/client/.env.bak
fi

# Start services (without cloudflared)
echo "Starting services..."
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d --build

echo ""
echo "=== Local Dev Environment Ready ==="
echo ""
echo "Dashboard:       http://localhost:8080"
echo "API:             http://localhost:8080/api"
echo "API Health:      http://localhost:8080/health"
echo "Telegram Bot:    Running (check logs)"
echo ""
echo "View logs:       docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs -f"
echo "View bot logs:   docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs -f tg-bot"
echo "Stop:            docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml down"
