# Cofr Telegram Bot

> Telegram bot for expense tracking with inline keyboards, guided flows, and receipt photos.

## Features

- **/add** — Guided flow with category picker, or instant add with text shortcuts
- **/list** — View recent transactions with filters
- **/summary** — Monthly spending summary with navigation
- **/edit** — Edit recent transactions interactively
- **/remove** — Delete with confirmation buttons
- **/config** — Set default currency
- **/help** — Interactive help with topic buttons
- **Receipt photos** — Attach photos to transactions
- **Backward compatible** — `!bang` commands and bare text still work

## Prerequisites

- Docker
- Telegram Bot via @BotFather
- PostgreSQL database (shared with server)

## Setup

Part of the Cofr monorepo. Run via Docker Compose from the repo root:

```bash
./scripts/setup_dev.sh    # Dev with hot-reload
./scripts/setup_prod.sh   # Production deploy
```

### Standalone (local dev)

```bash
cp .env.example .env      # Fill in TELEGRAM_BOT_TOKEN and DATABASE_URL
go run main.go
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Token from @BotFather |
| `DATABASE_URL` | Yes | PostgreSQL DSN |
| `ENV` | No | `production` or `local` |

## Quick Usage

```
G 45 groceries              # Quick add (bare text)
/add G 45 groceries $USD    # Slash command with currency
/add                         # Guided flow with buttons
/summary                     # Monthly overview
/edit                        # Pick and edit a transaction
/remove                      # Delete with confirmation
[photo with caption]         # Receipt attachment
```
