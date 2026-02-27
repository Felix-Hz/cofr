#!/bin/bash
set -e

echo "=== Cofr Dashboard Pi Setup ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Pi
if [[ $(uname -m) != "aarch64" && $(uname -m) != "armv7l" ]]; then
    echo -e "${YELLOW}Warning: Not running on ARM architecture. This script is intended for Raspberry Pi.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Check Docker
echo -e "\n${GREEN}[1/6] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}Docker installed. Please log out and back in, then run this script again.${NC}"
    exit 0
fi
echo "Docker: $(docker --version)"

# Step 2: Check Docker Compose
echo -e "\n${GREEN}[2/6] Checking Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found. Installing..."
    sudo apt update && sudo apt install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# Step 3: Clone repository if not present
echo -e "\n${GREEN}[3/6] Setting up repository...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# If running from a cloned repo, just pull latest
if [ -d ".git" ]; then
    echo "Repository already cloned, pulling latest..."
    git pull
else
    echo -e "${RED}This script should be run from within the cofr repository.${NC}"
    echo "Clone it first: git clone https://github.com/Felix-Hz/cofr.git && cd cofr"
    exit 1
fi

# Step 4: Check environment files
echo -e "\n${GREEN}[4/6] Checking environment files...${NC}"
for app in server client tg-bot; do
    if [ ! -f "apps/$app/.env" ]; then
        echo -e "${RED}Missing apps/$app/.env${NC}"
        if [ -f "apps/$app/.env.example" ]; then
            echo "Copy apps/$app/.env.example to apps/$app/.env and fill in your values"
        else
            echo "Create apps/$app/.env with the required environment variables"
        fi
        exit 1
    fi
done
echo "Environment files: OK"

# Step 5: Check Cloudflare Tunnel config
echo -e "\n${GREEN}[5/6] Checking Cloudflare Tunnel configuration...${NC}"
if [ ! -f "infra/cloudflared/config.yml" ]; then
    echo -e "${RED}Missing infra/cloudflared/config.yml${NC}"
    echo ""
    echo "To set up Cloudflare Tunnel:"
    echo "  1. Install cloudflared: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb && sudo dpkg -i cloudflared-linux-arm64.deb"
    echo "  2. Login: cloudflared tunnel login"
    echo "  3. Create tunnel: cloudflared tunnel create cofr-dashboard"
    echo "  4. Copy the credentials JSON to infra/cloudflared/"
    echo "  5. Copy infra/cloudflared/config.yml.example to infra/cloudflared/config.yml"
    echo "  6. Update config.yml with your tunnel ID"
    echo "  7. Route DNS: cloudflared tunnel route dns cofr-dashboard uitzicht.online"
    exit 1
fi

if ! ls infra/cloudflared/*.json &> /dev/null; then
    echo -e "${RED}Missing cloudflared credentials JSON file${NC}"
    echo "Copy your tunnel credentials JSON (from ~/.cloudflared/) to the infra/cloudflared/ directory"
    exit 1
fi
echo "Cloudflare Tunnel config: OK"

# Step 6: Start services
echo -e "\n${GREEN}[6/6] Starting services...${NC}"
docker compose -f infra/docker-compose.yml up -d --build

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Services are starting up. Check status with:"
echo "  docker compose -f infra/docker-compose.yml ps"
echo ""
echo "View logs with:"
echo "  docker compose -f infra/docker-compose.yml logs -f"
echo ""
echo "Your dashboard should be available at: https://uitzicht.online"
