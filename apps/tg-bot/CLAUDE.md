# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remind-o is a Telegram bot for expense tracking that uses TursoDB (libsql) for production and in-memory SQLite for local development. Users can track expenses, categorize spending, and query transactions through Telegram messages.

## Key Commands

### Development
```bash
# Run locally (uses in-memory SQLite)
go run main.go

# Run tests
go test ./test/...

# Build
go build -o main .

# Tidy dependencies
go mod tidy
```

### Docker
```bash
# Build image
docker build -t remind0 .

# Run container (production)
docker run -d \
  -e TELEGRAM_BOT_TOKEN=<token> \
  -e TURSO_DATABASE_URL=<url> \
  -e TURSO_AUTH_TOKEN=<token> \
  -e ENV=production \
  --name expenses-telegram-bot \
  remind0

# Run locally (in-memory DB)
docker run -d \
  -e TELEGRAM_BOT_TOKEN=<token> \
  -e TURSO_DATABASE_URL=dummy \
  -e TURSO_AUTH_TOKEN=dummy \
  -e ENV=local \
  --name expenses-telegram-bot \
  remind0
```

## Architecture

### Application Flow
1. **main.go**: Entry point that orchestrates initialization
   - Loads config from environment variables (app/config.go)
   - Initializes DB connection (db/db.go) - uses in-memory SQLite when ENV=local, TursoDB otherwise
   - Initializes repositories using singleton pattern (repository/init.go)
   - Sets up Telegram bot client
   - Runs infinite loop polling for Telegram updates with offset tracking

2. **Message Processing** (app/controllers.go):
   - HandleTelegramMessage validates messages, gets/creates users, and routes to command dispatcher
   - Messages prefixed with "!" are treated as commands
   - Messages without "!" are treated as "add" commands for quick expense entry

3. **Command System** (app/commands.go):
   - Dispatcher routes to: add, remove, list, help, edit (not implemented)
   - Commands return CommandResult struct with error handling and user-facing messages
   - Supports command aliases (e.g., "rm", "r", "delete" all map to remove)

4. **Repository Pattern** (repository/):
   - Singleton pattern initialized once with InitRepositories(db)
   - Access via UserRepo(), OffsetRepo(), TxRepo()
   - Each repository has interface (I*Repository) and implementation (*Repository)
   - All DB queries are encapsulated in repository methods

### Database Models (db/models.go)

- **User**: Stores Telegram user info (UserID is Telegram's user ID)
- **Transaction**: Expense records with category, amount, notes, timestamp, and hash for deduplication
- **Offset**: Tracks last processed Telegram update ID to prevent duplicate message processing

### Category System (app/utils.go:24-54)

Categories use short aliases that map to full names:
- $ → Income, S → Savings, U → Utilities, SUB → Subscriptions, R → Rent
- H → Health & Fitness, T → Transport, G → Groceries, GO → Going Out
- INV → Investment, SH → Shopping, EDU → Education, TR → Travel, MISC → Miscellaneous

### Message Parsing (app/utils.go)

- **parseAddTx**: Parses "CATEGORY AMOUNT [NOTES]" format
  - Supports batch amounts: "G (5-10-15) groceries" creates 3 transactions
  - Amount parsing handles both commas and dots as decimal separators
- **parseListOptions**: Parses query filters for list command
  - Special flags: "*" for all-time, "+" for aggregation
  - Supports date filters (DD/MM/YYYY), category filters, and result limits
  - Default time range: 28th of previous month to now (billing cycle logic)

## Environment Variables

Required variables:
- **TELEGRAM_BOT_TOKEN**: Telegram bot API token
- **TURSO_DATABASE_URL**: TursoDB connection URL (or "dummy" for local)
- **TURSO_AUTH_TOKEN**: TursoDB auth token (or "dummy" for local)
- **ENV**: "production" or "local" (determines DB backend)

Local development: Create `.env` file (auto-loaded when ENV != production)

## Important Implementation Details

- **Deduplication**: Transactions are hashed (SHA-256) using category + amount + notes + timestamp + userId to prevent duplicates (app/utils.go:108)
- **Offset Tracking**: The bot maintains a single Offset record to track the last processed Telegram update ID, preventing message reprocessing on reconnection (main.go:50-54)
- **Long-polling**: Bot uses 60-second timeout for Telegram update polling (app/controllers.go:20-24)
- **Message Validation**: 160 character limit on incoming messages (app/utils.go:97)
- **Repository Singleton**: All repositories initialized once and accessed via global functions to ensure single DB connection (repository/init.go)
- **GORM Auto-Migration**: Schema automatically migrated on startup (db/db.go:41)

## User Interaction Patterns

Commands are prefixed with "!" in Telegram messages:
- `!add G 45 groceries` or `!a G 45 groceries` - Add expense
- `G 45 groceries` - Quick add (no prefix needed)
- `!rm 123` or `!r 123 456` - Remove transaction(s) by ID
- `!ls` - List current cycle transactions (28th to now)
- `!ls *` - List all-time transactions
- `!ls +` - List with category aggregation
- `!ls G` - List groceries only
- `!ls 20` - List with custom limit
- `!h` or `!help` - General help
- `!h add` - Command-specific help

Error messages and help text are defined in app/messages.go.
