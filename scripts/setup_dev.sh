#!/bin/bash
set -e

echo "=== Cofr — Dev Environment Setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# ── Docker ──────────────────────────────────────────────────
# On macOS the engine is Docker Desktop: Homebrew's `docker`/`docker-compose`
# formulae are only clients (containers need a Linux VM, and there's no systemctl).
DOCKER_APP="/Applications/Docker.app"

docker_ready() { docker info >/dev/null 2>&1; }

wait_for_docker() {
    printf "Waiting for Docker to be ready"
    for _ in $(seq 1 90); do
        if docker_ready; then
            echo " ok"
            return 0
        fi
        printf "."
        sleep 2
    done
    echo ""
    return 1
}

install_docker_desktop() {
    echo "Docker Desktop is not installed. It's the Docker engine for macOS."
    if ! command -v brew >/dev/null 2>&1 || [ ! -t 0 ]; then
        echo "Install it with:  brew install --cask docker-desktop"
        echo "or download it from https://www.docker.com/products/docker-desktop/ and re-run this script."
        exit 1
    fi
    local formulae
    formulae=$(brew list --formula -1 2>/dev/null | grep -xE "docker|docker-compose" || true)
    if [ -n "$formulae" ]; then
        echo "Docker Desktop ships its own docker and compose CLIs, so the Homebrew"
        echo "formulae ($(echo "$formulae" | tr '\n' ' ' | sed 's/ $//')) will be uninstalled first."
    fi
    read -r -p "Install Docker Desktop with Homebrew now? [y/N] " reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
        echo "Install it with:  brew install --cask docker-desktop  and re-run this script."
        exit 1
    fi
    if [ -n "$formulae" ]; then
        # shellcheck disable=SC2086
        brew uninstall --formula $formulae
    fi
    brew install --cask docker-desktop
}

ensure_docker() {
    if [ "$(uname)" = "Darwin" ]; then
        if [ ! -d "$DOCKER_APP" ]; then
            install_docker_desktop
        fi
        if ! docker_ready; then
            echo "Starting Docker Desktop..."
            open -a "$DOCKER_APP"
            if ! wait_for_docker; then
                echo "Error: Docker Desktop didn't become ready."
                echo "  Open Docker Desktop once to finish its first-run setup, then re-run this script."
                exit 1
            fi
        fi
    else
        command -v docker >/dev/null 2>&1 || {
            echo "Error: docker is not installed. See https://docs.docker.com/engine/install/"
            exit 1
        }
        if ! docker_ready; then
            echo "Starting the Docker daemon (needs sudo)..."
            if command -v systemctl >/dev/null 2>&1; then
                sudo systemctl start docker
            elif command -v service >/dev/null 2>&1; then
                sudo service docker start
            fi
            if ! wait_for_docker; then
                echo "Error: the Docker daemon isn't reachable."
                echo "  If it is running, add yourself to the docker group: sudo usermod -aG docker \$USER"
                exit 1
            fi
        fi
    fi

    if ! docker compose version >/dev/null 2>&1; then
        echo "Error: the docker compose plugin is not available"
        echo "  Docker Desktop includes it; on Linux install the docker-compose-plugin package."
        exit 1
    fi
}

ensure_docker

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

# ── Generate missing secrets (values are never printed) ────
gen_hex() { openssl rand -hex "$1" 2>/dev/null || od -vN "$1" -An -tx1 /dev/urandom | tr -d ' \n'; }
gen_fernet_key() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32 | tr '+/' '-_'
    else
        gen_hex 32 | xxd -r -p | base64 | tr '+/' '-_'
    fi
}

fill_if_empty() {
    local file="$1" key="$2" generator="$3"
    local val
    val=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2-)
    if [ -z "$val" ] || [ "$val" = "your-generated-secret-min-32-chars" ]; then
        local tmp
        tmp=$(mktemp)
        # awk instead of sed -i: identical behaviour on macOS and Linux.
        awk -v k="$key" -v v="$($generator)" \
            'BEGIN { done = 0 } $0 ~ "^" k "=" { print k "=" v; done = 1; next } { print } END { if (!done) print k "=" v }' \
            "$file" > "$tmp" && mv "$tmp" "$file"
        echo "Generated $key in $file"
    fi
}

fill_if_empty "apps/server/.env" "JWT_SECRET" "gen_hex 64"
fill_if_empty "apps/server/.env" "ENCRYPTION_KEY" "gen_fernet_key"

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
