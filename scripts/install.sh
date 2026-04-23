#!/usr/bin/env bash
set -euo pipefail

COFR_VERSION="${COFR_VERSION:-latest}"
INSTALL_DIR="${COFR_DIR:-$HOME/.cofr}"
# Use the version tag as the git ref so compose files match the running images.
# "latest" maps to main; a pinned version (e.g. 2025.4.0) uses that tag directly.
GIT_REF="main"
[[ "$COFR_VERSION" != "latest" ]] && GIT_REF="$COFR_VERSION"
GITHUB_RAW="https://raw.githubusercontent.com/felix-hz/cofr/${GIT_REF}"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }
die()   { printf "\033[31merror:\033[0m %s\n" "$*" >&2; exit 1; }

bold "cofr self-hosted installer"
echo ""

# --- prereq check ---
if ! command -v docker &>/dev/null; then
  die "Docker not found. Install it from https://docs.docker.com/get-docker/ and re-run."
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
    BASE_URL="http://localhost:8080"
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

# --- start ---
dim "  pulling images and starting services..."
COFR_DOMAIN="${COFR_DOMAIN:-localhost}" \
COFR_VERSION="$COFR_VERSION" \
docker compose -p cofr \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.selfhost.yml \
  up -d

# --- health check ---
HEALTH_URL="http://localhost:80/health"

dim "  waiting for cofr to be ready..."
for i in $(seq 1 15); do
  if curl -fs "$HEALTH_URL" &>/dev/null; then
    break
  fi
  if [[ $i -eq 15 ]]; then
    die "cofr did not become healthy in time. Check logs: docker compose -p cofr logs"
  fi
  sleep 4
done

# --- done ---
echo ""
green "cofr is running"
echo ""
if [[ "${COFR_DOMAIN:-localhost}" == "localhost" ]]; then
  echo "  -> http://localhost:8080"
else
  echo "  -> https://${COFR_DOMAIN}"
fi
echo ""
dim "  Logs:  docker compose -p cofr logs -f"
dim "  Stop:  docker compose -p cofr down"
dim "  Data:  $INSTALL_DIR"
echo ""
