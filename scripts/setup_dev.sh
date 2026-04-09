#!/bin/bash
set -e

echo "=== Cofr — Dev Environment Setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# ── Prerequisites ───────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose plugin is not installed"; exit 1; }

# ── Environment files (create from examples if missing) ─────
copy_env_if_missing() {
    local target="$1"
    local example="$1.example"
    if [ ! -f "$target" ]; then
        if [ -f "$example" ]; then
            cp "$example" "$target"
            echo "Created $target from $example"
        else
            echo "Warning: $target and $example not found — skipping"
        fi
    fi
}

copy_env_if_missing "infra/.env"
copy_env_if_missing "apps/server/.env"
copy_env_if_missing "apps/client/.env"

# ── Create dev env overrides if missing ───────────────────
if [ ! -f "apps/server/.dev.env" ]; then
    cat > "apps/server/.dev.env" <<'EOF'
ENV=local
API_URL=http://localhost:8080/api
FRONTEND_URL=http://localhost:8080
EOF
    echo "Created apps/server/.dev.env"
fi

# ── Warn about empty secrets ────────────────────────────────
warn_if_empty() {
    local file="$1" key="$2"
    local val
    val=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2-)
    if [ -z "$val" ] || [ "$val" = "your-generated-secret-min-32-chars" ]; then
        echo "Warning: $key in $file is not set — generate a real value before using auth"
    fi
}

warn_if_empty "apps/server/.env" "JWT_SECRET"
warn_if_empty "apps/server/.env" "ENCRYPTION_KEY"

# ── Start services ──────────────────────────────────────────
echo ""
echo "Starting dev services..."
docker compose -p cofr-dev -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d --build

echo ""
echo "=== Dev Environment Ready ==="
echo ""
echo "Dashboard:       http://localhost:8080"
echo "API:             http://localhost:8080/api"
echo "API Health:      http://localhost:8080/health"
echo ""
echo "View logs:       docker compose -p cofr-dev -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs -f"
echo "Stop:            docker compose -p cofr-dev -f infra/docker-compose.yml -f infra/docker-compose.dev.yml down"
