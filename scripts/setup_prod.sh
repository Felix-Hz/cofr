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
export SERVER_IMAGE_TAG="${SERVER_IMAGE_TAG:-$APP_IMAGE_TAG}"
export CLIENT_IMAGE_TAG="${CLIENT_IMAGE_TAG:-$APP_IMAGE_TAG}"

# ── Require all env files ───────────────────────────────────
MISSING=0
for f in infra/.env infra/.prod.env apps/server/.env apps/server/.prod.env; do
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
check_env_var "infra/.prod.env" "CLOUDFLARE_TUNNEL_TOKEN" || INVALID=1

# Backup system environment variables (only warn if missing)
check_env_var "infra/.prod.env" "AWS_ACCESS_KEY_ID" || echo "Warning: AWS_ACCESS_KEY_ID not set - backup system will not work"
check_env_var "infra/.prod.env" "AWS_SECRET_ACCESS_KEY" || echo "Warning: AWS_SECRET_ACCESS_KEY not set - backup system will not work"
check_env_var "infra/.prod.env" "BACKUP_S3_BUCKET" || echo "Warning: BACKUP_S3_BUCKET not set - backup system will not work"

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

# ── Detect bind-mount config changes ─────────────────────────
# Docker Compose won't recreate a container when only the contents
# of a bind-mounted file change (the mount path is the same).
# We checksum tracked config files and compare with the last deploy
# to selectively --force-recreate only the affected services.
HASH_DIR="/opt/cofr/.deploy-hashes"
mkdir -p "$HASH_DIR"

config_changed() {
    local file="$1" service="$2"
    local new_hash old_hash
    new_hash=$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)
    old_hash=$(cat "$HASH_DIR/$service" 2>/dev/null)
    if [ "$new_hash" != "$old_hash" ]; then
        echo "$new_hash" > "$HASH_DIR/$service"
        return 0  # changed
    fi
    return 1  # unchanged
}

RECREATE_SERVICES=""
if config_changed "infra/postgresql.conf" "postgres"; then
    RECREATE_SERVICES="$RECREATE_SERVICES postgres"
fi
if config_changed "infra/Caddyfile.prod" "caddy"; then
    RECREATE_SERVICES="$RECREATE_SERVICES caddy"
fi

# ── Start services ──────────────────────────────────────────
echo ""
echo "Deploying production services:"
echo "  server:  $SERVER_IMAGE_TAG"
echo "  client:  $CLIENT_IMAGE_TAG"
COMPOSE="docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml"
$COMPOSE pull
$COMPOSE up -d --remove-orphans

if [ -n "$RECREATE_SERVICES" ]; then
    echo "Config change detected, recreating:$RECREATE_SERVICES"
    # shellcheck disable=SC2086
    $COMPOSE up -d --force-recreate $RECREATE_SERVICES
fi

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
if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
else
    SUDO=""
fi

# ── Ensure AWS CLI is installed (required by backup_postgres.sh) ──
if ! command -v aws >/dev/null 2>&1; then
    echo "AWS CLI not found, installing v2 from official source..."
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq unzip curl
    AWS_TMP_DIR="$(mktemp -d)"
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "$AWS_TMP_DIR/awscliv2.zip"
    (cd "$AWS_TMP_DIR" && unzip -q awscliv2.zip && $SUDO ./aws/install)
    rm -rf "$AWS_TMP_DIR"
    echo "AWS CLI installed: $(aws --version)"
fi

echo "Installing PostgreSQL backup systemd service..."
if [ -d "/etc/systemd/system" ]; then
    if [ -n "$SUDO" ] || [ "$(id -u)" -eq 0 ]; then
        # Copy systemd service and timer files
        $SUDO cp infra/systemd/postgres-backup.service /etc/systemd/system/
        $SUDO cp infra/systemd/postgres-backup.timer /etc/systemd/system/

        # Reload systemd daemon
        $SUDO systemctl daemon-reload

        # Enable and start the timer (not the service - timer starts the service)
        $SUDO systemctl enable --now postgres-backup.timer

        echo "Backup system installed. Service will run daily at midnight UTC."
        echo "Check status: $SUDO systemctl status postgres-backup.timer"
        echo "View logs: $SUDO journalctl -u postgres-backup"
    else
        echo "Warning: sudo is not available - backup systemd service not installed"
    fi
else
    echo "Warning: /etc/systemd/system not found - systemd service not installed"
fi

echo ""
echo "=== Production Deployment Complete ==="
echo ""
echo "Site:            https://cofr.cash"
echo "API:             https://cofr.cash/api"
echo "API Health:      https://cofr.cash/health"
echo "Image Tags:      server=$SERVER_IMAGE_TAG client=$CLIENT_IMAGE_TAG"
echo ""
echo "View logs:       $COMPOSE logs -f"
echo "Stop:            $COMPOSE down"
