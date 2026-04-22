# Contributing

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Bun](https://bun.sh) (client)
- [uv](https://docs.astral.sh/uv/) (server)
- [Rust](https://rustup.rs) + [maturin](https://github.com/PyO3/maturin) (scribe extension)

## Local dev

```bash
./scripts/setup_dev.sh
```

- This starts all services at `http://localhost:8080`. 
- The server `.env` is loaded from `apps/server/.env`, copy from `.env.example` and fill in values.

## Tests

```bash
cd apps/server && uv run pytest        # 131 tests, in-memory SQLite
cd apps/scribe && cargo test           # 25 tests, native Rust
cd apps/client && bun run test         # 54 tests, Vitest
```

All test suites run without external dependencies (no Docker, no DB, no network).

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add merchant tagging to transactions
fix: handle null category on transfer rows
chore(deps): bump authlib to 1.4.0
```

## Pull requests

1. Branch off `main`
2. Keep PRs focused - one logical change per PR
3. Make sure all three test suites pass
4. Update docs (README, CLAUDE.md) if behaviour changes
5. One approval required to merge

## Code style

- **Server**: `ruff format` + `ruff check` (enforced by pre-commit)
- **Client**: `biome check --write` (enforced by pre-commit)
- **Scribe**: `cargo fmt` + `cargo clippy`

Run `pre-commit run --all-files` before pushing to catch issues early.
