# <img width="25" height="25" alt="cofr" src="https://github.com/user-attachments/assets/574a7125-4c7a-4697-9080-7b3636e6f5ee" /> _**cofr**_

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
- Generate a Fernet encryption key for the server:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

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

All services share a PostgreSQL database, running as a Docker Compose service.
Connection configured via `DATABASE_URL` in each app's `.env`.

## Security

- UUID primary keys prevent ID enumeration
- PII encrypted at rest (Fernet symmetric encryption)
- OAuth email auto-linking disabled
- CORS restricted to `FRONTEND_URL`
