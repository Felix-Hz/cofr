<p align="center"><img src="apps/client/public/icon.svg" width="72" height="72" alt=""></p>

<h1 align="center">cofr</h1>

<p align="center">A personal finance tracker you run yourself.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="License: AGPL v3"></a>
  <a href="https://github.com/felix-hz/cofr/actions/workflows/ci.yml?query=branch%3Amain"><img src="https://github.com/felix-hz/cofr/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI"></a>
</p>

---

cofr keeps track of your accounts, spending and transfers in your own currencies, on a server you control. It installs with one command, imports bank statements and exports to CSV, XLSX and PDF. See [cofr.cash](https://cofr.cash).

## Contents

- [Features](#features)
- [Self-hosting](#self-hosting)
- [Architecture](#architecture)
- [Development](#development)
- [License](#license)

## Features

- Accounts, categories and transfers between accounts
- Multiple currencies, with exchange rates refreshed daily
- Bank statement import (CSV)
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

To update, run the same command again. Env files and data are kept. To install a specific release, set `COFR_VERSION`, for example `COFR_VERSION=2026.3.0`.

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

The icon, favicon, app icons and iOS splash screens are all drawn from one 16-pixel grid in [`apps/client/scripts/make-icon.mjs`](apps/client/scripts/make-icon.mjs); run `node scripts/make-icon.mjs` from `apps/client` after changing it.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for prerequisites and pull request guidelines, and [`SECURITY.md`](SECURITY.md) for reporting vulnerabilities.

## License

[AGPL-3.0](LICENSE)
