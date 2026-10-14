# <img width="20" height="20" alt="cofr" src="https://github.com/user-attachments/assets/574a7125-4c7a-4697-9080-7b3636e6f5ee" /> cofr

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/felix-hz/cofr/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/felix-hz/cofr/actions/workflows/ci.yml?query=branch%3Amain)

A personal finance tracker you run yourself. See [cofr.cash](https://cofr.cash).

## Features

- Accounts, categories and transfers between accounts
- Multiple currencies, with exchange rates refreshed daily
- Bank statement import (ANZ New Zealand CSV)
- Export to CSV, XLSX and PDF
- Configurable dashboard
- Google or email/password sign-in
- Personal data encrypted at rest; error reporting only if you configure it

## Self-hosting

Requires Docker.

```bash
curl -fsSL https://cofr.cash/install.sh | bash
```

The installer generates secrets, pulls the release images and starts the stack with Docker Compose. Set `COFR_DOMAIN=yourdomain.com` first to serve it over HTTPS with a Let's Encrypt certificate; otherwise it runs on localhost.

To update, run the same command again. Env files and data are kept. To install a specific release, set `COFR_VERSION`, e.g. `COFR_VERSION=2026.3.0`.

The installer source is in [`scripts/install.sh`](scripts/install.sh).

## Architecture

```
Caddy
 ├── /api/*  → server (FastAPI)
 └── /*      → client (React Router, Bun)
                 │
              PostgreSQL
```

`apps/scribe` is a Rust extension used by the server for exports and statement parsing.

## Development

```bash
./scripts/setup_dev.sh          # dev stack at http://localhost:8080
cd apps/server && uv run pytest
cd apps/scribe && cargo test
cd apps/client && bun run test
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for prerequisites and pull request guidelines, and [`SECURITY.md`](SECURITY.md) for reporting vulnerabilities.

## License

[AGPL-3.0](LICENSE)
