#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${COFR_DIR:-$HOME/.cofr}"

if [ -n "${COFR_VERSION:-}" ]; then
  : # caller-provided, keep as-is
elif COFR_VERSION=$(curl -fsSL "https://api.github.com/repos/felix-hz/cofr/releases/latest" 2>/dev/null \
      | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/') && [ -n "$COFR_VERSION" ]; then
  : # resolved from latest GitHub release
else
  COFR_VERSION="main"
fi

GITHUB_RAW="https://raw.githubusercontent.com/felix-hz/cofr/${COFR_VERSION}"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }
die()   { printf "\033[31merror:\033[0m %s\n" "$*" >&2; exit 1; }

echo ""
cat <<'EOF'
  _____   _____     _____  __ __
 /\ __/\ ) ___ (  /\_____\/_/\__/\
 ) )__\// /\_/\ \( (  ___/) ) ) ) )
/ / /  / /_/ (_\ \\ \ \_ /_/ /_/_/
\ \ \_ \ \ )_/ / // / /_\\ \ \ \ \
 ) )__/\\ \/_\/ // /____/ )_) ) \ \
 \/___\/ )_____( \/_/     \_\/ \_\/
EOF
echo ""
dim "  version: $COFR_VERSION"
echo ""

# --- prereq check ---
if ! command -v docker &>/dev/null; then
  die "Docker not found. Install it from https://docs.docker.com/get-docker/ and re-run."
fi
if ! docker info &>/dev/null; then
  die "Docker is installed but not running. Start Docker Desktop (or 'sudo systemctl start docker') and re-run."
fi

# --- upgrade detection ---
UPGRADING=false
if docker compose -p cofr ps -q 2>/dev/null | grep -q .; then
  UPGRADING=true
  dim "  existing installation detected — upgrading to $COFR_VERSION"
else
  # Check for orphaned volumes from a previous failed install and purge them so
  # postgres re-initialises cleanly with the current credentials.
  if docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qE '^cofr_(postgres|caddy)'; then
    dim "  cleaning up previous failed installation..."
    docker compose -p cofr down -v --remove-orphans 2>/dev/null || true
  fi
  dim "  fresh install"
fi
echo ""

# --- port conflict check (skip if already running, those are ours) ---
port_in_use() {
  (ss -tlnH 2>/dev/null | grep -q ":$1 ") || \
  (command -v lsof &>/dev/null && lsof -iTCP:"$1" -sTCP:LISTEN -P -n 2>/dev/null | grep -q .)
}

if [ "$UPGRADING" = "false" ]; then
  for port in 80 443; do
    if port_in_use "$port"; then
      die "Port $port is already in use. Stop the conflicting service and re-run."
    fi
  done
fi

# --- dirs ---
mkdir -p "$INSTALL_DIR/infra" "$INSTALL_DIR/apps/server"
cd "$INSTALL_DIR"

# --- secret generation ---
gen_hex() { openssl rand -hex "$1" 2>/dev/null || od -vN "$1" -An -tx1 /dev/urandom | tr -d ' \n'; }

gen_fernet_key() {
  if command -v python3 &>/dev/null; then
    python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
  else
    docker run --rm python:3.12-slim \
      python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
  fi
}

# --- write env files (idempotent) ---
if [[ ! -f infra/.env ]]; then
  PG_PASS="$(gen_hex 32)"
  cat > infra/.env <<ENV
POSTGRES_USER=cofr
POSTGRES_DB=cofr
POSTGRES_PASSWORD=${PG_PASS}
ENV
  dim "  created infra/.env"
else
  dim "  infra/.env exists, skipping"
  PG_PASS="$(grep POSTGRES_PASSWORD infra/.env | cut -d= -f2)"
fi

if [[ ! -f apps/server/.env ]]; then
  JWT_SECRET="$(gen_hex 64)"
  ENC_KEY="$(gen_fernet_key)"
  DOMAIN="${COFR_DOMAIN:-localhost}"
  if [[ "$DOMAIN" == "localhost" ]]; then
    BASE_URL="http://localhost"
  else
    BASE_URL="https://${DOMAIN}"
  fi
  cat > apps/server/.env <<ENV
ENV=production
DATABASE_URL=postgresql://cofr:${PG_PASS}@postgres:5432/cofr
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENC_KEY}
FRONTEND_URL=${BASE_URL}
API_URL=${BASE_URL}/api
ENV
  dim "  created apps/server/.env"
else
  dim "  apps/server/.env exists, skipping"
fi

# --- fetch compose files ---
dim "  downloading compose files..."
curl -fsSL "$GITHUB_RAW/infra/docker-compose.yml"          -o infra/docker-compose.yml
curl -fsSL "$GITHUB_RAW/infra/docker-compose.selfhost.yml" -o infra/docker-compose.selfhost.yml
curl -fsSL "$GITHUB_RAW/infra/Caddyfile.selfhost"          -o infra/Caddyfile.selfhost
curl -fsSL "$GITHUB_RAW/infra/pg_hba.selfhost.conf"        -o infra/pg_hba.selfhost.conf

# --- start ---
dim "  pulling images and starting services..."
(
  cd "$INSTALL_DIR/infra"
  COFR_DOMAIN="${COFR_DOMAIN:-localhost}" \
  COFR_VERSION="$COFR_VERSION" \
  docker compose -p cofr \
    -f docker-compose.yml \
    -f docker-compose.selfhost.yml \
    up -d
)

# --- health check ---
dim "  waiting for cofr to be ready..."
for i in $(seq 1 15); do
  if curl -fs "http://localhost/health" &>/dev/null; then
    break
  fi
  if [[ $i -eq 15 ]]; then
    die "cofr did not become healthy in time. Check logs: docker compose -p cofr logs"
  fi
  sleep 4
done

# --- done ---
echo ""
green "cofr is running  ($COFR_VERSION)"
echo ""
if [[ "${COFR_DOMAIN:-localhost}" == "localhost" ]]; then
  echo "  -> http://localhost"
else
  echo "  -> https://${COFR_DOMAIN}"
fi
echo ""
dim "  Logs:    docker compose -p cofr logs -f"
dim "  Stop:    docker compose -p cofr down"
dim "  Upgrade: curl -fsSL https://cofr.cash/install.sh | bash"
dim "  Data:    $INSTALL_DIR"
echo ""
