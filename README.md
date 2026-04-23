# <img width="20" height="20" alt="cofr" src="https://github.com/user-attachments/assets/574a7125-4c7a-4697-9080-7b3636e6f5ee" /> cofr

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/felix-hz/cofr/actions/workflows/ci.yml/badge.svg)](https://github.com/felix-hz/cofr/actions)

Personal finance tracker. Self-host in seconds, or use [cofr.cash](https://cofr.cash).

## Self-hosting

```bash
curl -fsSL https://cofr.cash/install.sh | bash
```

Bring your own domain or run on localhost. The installer auto-generates all secrets, pulls pre-built images, and starts everything via Docker Compose. No accounts, no telemetry.

**Optional:** set `COFR_DOMAIN=yourdomain.com` before running to get automatic HTTPS via Let's Encrypt.

See [`scripts/install.sh`](scripts/install.sh) for the full installer source.

## Updating

Re-run the installer on an existing installation. Env files are left untouched, images are pulled fresh, and data volumes are preserved:

```bash
curl -fsSL https://cofr.cash/install.sh | bash
```

To pin a specific release:

```bash
COFR_VERSION=2026.3.0 curl -fsSL https://cofr.cash/install.sh | bash
```

## Hosted

[cofr.cash](https://cofr.cash) runs the same open-source codebase. Free tier available.

## Features

- Expense tracking with accounts, categories, and inter-account transfers
- Composable dashboard - drag widgets into place
- Multi-currency support with daily exchange rate updates
- CSV, XLSX, and PDF exports (Rust-accelerated via PyO3)
- Google OAuth + email/password auth, email verification
- PII encrypted at rest (Fernet). No telemetry unless you opt in.

## Architecture

```
Client (React Router 7)
    |
   Caddy (reverse proxy, auto-HTTPS)
    |-- /api/*  --> Server (FastAPI, port 5784)
    |-- /*      --> Client (Bun SSR, port 3000)
                        |
                   PostgreSQL 16
```

Deployed via Docker Compose. Self-hosted variant uses `docker-compose.selfhost.yml` (direct ports, no Cloudflare Tunnel). Production variant at cofr.cash adds Cloudflare Tunnel + S3-backed Postgres.

## Development

```bash
./scripts/setup_dev.sh          # hot-reload dev stack at http://localhost:8080
cd apps/server && uv run pytest # 131 server tests
cd apps/scribe && cargo test    # 25 Rust serialization tests
cd apps/client && bun run test  # 54 client tests
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for prerequisites and PR guidelines.

## Contributing

Pull requests welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

No telemetry by default. See [`SECURITY.md`](SECURITY.md) for the disclosure process and data protection details.

## License

[AGPL-3.0](LICENSE)
