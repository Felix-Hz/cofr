# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Cofr is a monorepo for a personal finance dashboard. It contains three services that share a Turso (libsql) database and are deployed together on a Raspberry Pi via Docker Compose + Caddy + Cloudflare Tunnel.

## Repository Structure

- **apps/server/** — FastAPI backend (Python). Handles REST API for expenses, authentication (JWT + OAuth), and account management. Port 5784.
- **apps/tg-bot/** — Telegram bot (Go). Expense tracking via Telegram messages with category aliases and batch entry. See `apps/tg-bot/CLAUDE.md` for detailed architecture.
- **apps/client/** — Web dashboard (TypeScript, React Router 7, Bun). SSR frontend with Tailwind CSS. Port 3000.
- **infra/** — Docker Compose files, Caddyfile, Cloudflare Tunnel config.
- **scripts/** — Development and deployment scripts.

## Key Commands

```bash
# Local dev with Docker (hot-reload)
./scripts/dev.sh

# Local dev without Docker
./scripts/run-local.sh

# Validate compose config
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml config

# Production deploy (on Pi)
./scripts/setup-pi.sh
```

## Architecture

- Caddy reverse proxy routes `/api/*` → server:5784, everything else → client:3000
- Cloudflare Tunnel exposes Caddy at `uitzicht.online`
- All three apps connect to the same Turso database
- tg-bot uses in-memory SQLite when `ENV=local`

## Environment

Each app has its own `.env` file in its directory. See root `.env.example` for all required variables.
