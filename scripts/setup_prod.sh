#!/bin/bash
set -e

echo "=== Cofr — Production Deployment ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# ── Prerequisites ───────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose plugin is not installed"; exit 1; }

# ── Require all env files ───────────────────────────────────
MISSING=0
for f in infra/.env apps/server/.env apps/server/.prod.env apps/client/.env apps/tg-bot/.env apps/tg-bot/.prod.env; do
    if [ ! -f "$f" ]; then
        echo "Error: $f not found"
        MISSING=1
    fi
done

# ── Require cloudflared config ──────────────────────────────
if [ ! -d "infra/cloudflared" ]; then
    echo "Error: infra/cloudflared/ directory not found"
    MISSING=1
elif [ ! -f "infra/cloudflared/config.yml" ]; then
    echo "Error: infra/cloudflared/config.yml not found"
    MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo "Production requires all config files to exist. See .env.example files for reference."
    exit 1
fi

# ── Validate critical env vars ──────────────────────────────
check_env_var() {
    local file="$1" key="$2"
    local val
    val=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2-)
    if [ -z "$val" ] || [ "$val" = "your-generated-secret-min-32-chars" ] || [ "$val" = "123456:ABC-DEF..." ]; then
        echo "Error: $key in $file must be set to a real value"
        return 1
    fi
    return 0
}

INVALID=0
check_env_var "apps/server/.env" "JWT_SECRET" || INVALID=1
check_env_var "apps/server/.env" "ENCRYPTION_KEY" || INVALID=1
check_env_var "apps/server/.env" "DATABASE_URL" || INVALID=1
check_env_var "apps/tg-bot/.env" "TELEGRAM_BOT_TOKEN" || INVALID=1

if [ "$INVALID" -eq 1 ]; then
    echo ""
    echo "Fix the above env vars before deploying to production."
    exit 1
fi

# ── Warnings ────────────────────────────────────────────────
FRONTEND_URL=$(grep "^FRONTEND_URL=" apps/server/.prod.env 2>/dev/null | cut -d'=' -f2-)
if [ "$FRONTEND_URL" != "https://cofr.cash" ]; then
    echo "Warning: FRONTEND_URL in .prod.env is '$FRONTEND_URL' (expected 'https://cofr.cash')"
fi

ENV_VAL=$(grep "^ENV=" apps/server/.prod.env 2>/dev/null | cut -d'=' -f2-)
if [ "$ENV_VAL" != "production" ]; then
    echo "Warning: ENV in .prod.env is '$ENV_VAL' (expected 'production')"
fi

# ── Start services ──────────────────────────────────────────
echo ""
echo "Starting production services..."
docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build

echo ""
echo "=== Production Deployment Complete ==="
echo ""
echo "Site:            https://cofr.cash"
echo "API:             https://cofr.cash/api"
echo "API Health:      https://cofr.cash/health"
echo "Telegram Bot:    Running"
echo ""
echo "View logs:       docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f"
echo "Stop:            docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml down"
