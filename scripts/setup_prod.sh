#!/bin/bash
set -e

echo "=== Cofr — Production Deployment ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# ── Prerequisites ───────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose plugin is not installed"; exit 1; }

if [ -f "infra/.prod.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "infra/.prod.env"
    set +a
fi

APP_IMAGE_TAG="${DEPLOY_IMAGE_TAG:-${APP_IMAGE_TAG:-main}}"
export APP_IMAGE_TAG

# ── Require all env files ───────────────────────────────────
MISSING=0
for f in infra/.env infra/.prod.env apps/server/.env apps/server/.prod.env apps/tg-bot/.env apps/tg-bot/.prod.env; do
    if [ ! -f "$f" ]; then
        echo "Error: $f not found"
        MISSING=1
    fi
done

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
check_env_var "infra/.prod.env" "CLOUDFLARE_TUNNEL_TOKEN" || INVALID=1

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

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    echo "Logging in to GHCR..."
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
fi

# ── Start services ──────────────────────────────────────────
echo ""
echo "Deploying production services with image tag: $APP_IMAGE_TAG"
docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml pull
docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --remove-orphans

if command -v curl >/dev/null 2>&1; then
    echo "Verifying local health endpoint..."
    if ! curl --fail --silent --show-error --retry 10 --retry-delay 3 "http://localhost:8080/health" >/dev/null; then
        echo "Warning: local health check did not succeed yet"
    fi

    echo "Verifying public health endpoint..."
    if ! curl --fail --silent --show-error --retry 10 --retry-delay 3 "https://cofr.cash/health" >/dev/null; then
        echo "Warning: public health check did not succeed yet"
    fi
fi

echo ""
echo "=== Production Deployment Complete ==="
echo ""
echo "Site:            https://cofr.cash"
echo "API:             https://cofr.cash/api"
echo "API Health:      https://cofr.cash/health"
echo "Telegram Bot:    Running"
echo "Image Tag:       $APP_IMAGE_TAG"
echo ""
echo "View logs:       docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f"
echo "Stop:            docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml down"
