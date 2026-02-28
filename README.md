# 💰 cofr

<img width="1536" height="649" alt="banner" src="https://github.com/user-attachments/assets/73ab85f0-9a72-481b-b185-cd4f06ccb41e" />

## Structure

```
cofr/
├── apps/
│   ├── server/      # FastAPI backend (Python, port 5784)
│   ├── tg-bot/      # Telegram bot (Go)
│   └── client/      # Web dashboard (React Router 7 / Bun, port 3000)
├── infra/           # Docker Compose, Caddyfile, Cloudflare Tunnel config
└── scripts/         # Dev, local run, and Pi setup scripts
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Environment files: copy `.env.example` values into `apps/server/.env`,
  `apps/tg-bot/.env`, `apps/client/.env`

### Local development (Docker)

```bash
./scripts/run.sh
```

## Services

| Service     | Tech                              | Port | Description                                      |
| ----------- | --------------------------------- | ---- | ------------------------------------------------ |
| server      | Python / FastAPI                  | 5784 | REST API for expenses, auth, accounts            |
| tg-bot      | Go                                | —    | Telegram bot for expense tracking                |
| client      | TypeScript / React Router 7 / Bun | 3000 | Web dashboard with SSR                           |
| caddy       | Caddy 2                           | 80   | Reverse proxy (`/api/*` → server, `/*` → client) |
| cloudflared | Cloudflare Tunnel                 | —    | Exposes services at `uitzicht.online`            |

## Database

All services share a [Turso](https://turso.tech/) (libsql) database. No local DB
setup needed — set `ENV=local` in tg-bot for in-memory SQLite during
development.
