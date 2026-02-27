#!/bin/bash
set -e

echo "=== Starting Cofr Services Locally (No Docker) ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if app directories exist
echo "Checking app directories..."
for app in tg-bot server client; do
    if [ ! -d "$REPO_ROOT/apps/$app" ]; then
        echo -e "${RED}✗ apps/$app not found at $REPO_ROOT/apps/$app${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ apps/$app found${NC}"
done
echo ""

# Check environment files
echo "Checking environment files..."
for app in tg-bot server client; do
    if [ ! -f "$REPO_ROOT/apps/$app/.env" ]; then
        echo -e "${RED}✗ apps/$app/.env not found${NC}"
        echo "  Please create .env file in apps/$app/"
        exit 1
    fi
    echo -e "${GREEN}✓ apps/$app/.env found${NC}"
done
echo ""

# Create log directory
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "=== Stopping Services ==="
    pkill -P $$ || true
    echo "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start tg-bot (Golang bot)
echo -e "${YELLOW}Starting tg-bot (Telegram Bot)...${NC}"
cd "$REPO_ROOT/apps/tg-bot"
go run main.go > "$LOG_DIR/tg-bot.log" 2>&1 &
TG_BOT_PID=$!
echo -e "${GREEN}✓ tg-bot started (PID: $TG_BOT_PID)${NC}"
echo "  Logs: $LOG_DIR/tg-bot.log"
echo ""

# Wait a moment for tg-bot to initialize
sleep 2

# Start server (FastAPI)
echo -e "${YELLOW}Starting server (API)...${NC}"
cd "$REPO_ROOT/apps/server"
uv run uvicorn app.main:app --host 0.0.0.0 --port 5784 > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}✓ server started (PID: $SERVER_PID)${NC}"
echo "  Logs: $LOG_DIR/server.log"
echo "  API: http://localhost:5784"
echo "  Health: http://localhost:5784/health"
echo ""

# Wait for API to start
echo "Waiting for server API to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:5784/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ server API is ready${NC}"
        break
    fi
    sleep 1
done
echo ""

# Start client (React Router)
echo -e "${YELLOW}Starting client (Dashboard)...${NC}"
cd "$REPO_ROOT/apps/client"

# Update .env to point to local API
if grep -q "VITE_API_BASE_URL" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:5784|' .env
    else
        sed -i 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:5784|' .env
    fi
fi

bun run dev > "$LOG_DIR/client.log" 2>&1 &
CLIENT_PID=$!
echo -e "${GREEN}✓ client started (PID: $CLIENT_PID)${NC}"
echo "  Logs: $LOG_DIR/client.log"
echo "  Dashboard: http://localhost:5173 (or check logs for actual port)"
echo ""

echo "=== All Services Running ==="
echo ""
echo "Services:"
echo "  - tg-bot:  Running (check Telegram)"
echo "  - server:  http://localhost:5784"
echo "  - client:  http://localhost:5173"
echo ""
echo "Logs directory: $LOG_DIR"
echo ""
echo "Useful commands:"
echo "  tail -f $LOG_DIR/tg-bot.log   # Watch bot logs"
echo "  tail -f $LOG_DIR/server.log   # Watch API logs"
echo "  tail -f $LOG_DIR/client.log   # Watch UI logs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
