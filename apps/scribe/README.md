# scribe

`scribe` is the Rust-backed export and statement-parsing engine for Cofr.

It is packaged as a Python extension module with `PyO3` and `maturin`, then imported by the server as `import scribe`.

## What it does

- Exports transactions to `CSV`, `XLSX`, and `PDF`
- Exports account summaries to `CSV`, `XLSX`, and `PDF`
- Exports category summaries to `CSV`, `XLSX`, and `PDF`
- Exports full data dumps as:
  - zipped CSV files
  - multi-sheet XLSX workbooks
- Parses bank statement CSVs for import (currently ANZ New Zealand account exports)

## Public Python API

The module is defined in [src/lib.rs](/Users/someone/Documents/repos/cofr/apps/scribe/src/lib.rs).

```python
import scribe

scribe.export_csv(rows, currency) -> bytes
scribe.export_xlsx(rows, sheets, currency) -> bytes
scribe.export_pdf(rows, meta) -> bytes
scribe.export_csv_full_dump(transactions, accounts, categories) -> bytes
scribe.export_accounts_csv(rows) -> bytes
scribe.export_categories_csv(rows) -> bytes
scribe.parse_bank_csv(data, filename=None) -> dict
```

All export functions return raw file bytes. The caller is responsible for writing those bytes to disk or sending them in an HTTP response.

## Row Contracts

The Rust layer accepts Python `dict` objects and converts them into typed rows in [src/models.rs](/Users/someone/Documents/repos/cofr/apps/scribe/src/models.rs).

### Transactions

Expected keys:

```python
{
    "date": str,
    "description": str,
    "amount": float,
    "currency": str,
    "category": str,
    "category_type": str,
    "account": str,
    "account_type": str,
    "is_transfer": bool,
    "transfer_direction": str,
    "is_opening_balance": bool,
}
```

### Accounts

Expected keys:

```python
{
    "name": str,
    "type": str,
    "balance": float,
}
```

### Categories

Expected keys:

```python
{
    "name": str,
    "type": str,
    "total": float,
    "count": int,
}
```

Missing values are currently defaulted during extraction rather than hard-failing. That keeps the bridge tolerant, but it also means malformed input can degrade output quality silently.

## Statement Import

`parse_bank_csv(data, filename=None)` is the inverse of export: it turns a raw bank download into normalized rows. The format is detected from the header row (columns may be in any order), the file is decoded as UTF-8 with a Latin-1 fallback, and amounts are parsed exactly into cents.

```python
{
    "format": "anz_nz_account",
    "bank": "ANZ",
    "currency_hint": "NZD" | None,
    "account_ref": "01-2345-6789012-00" | None,  # taken from the filename when present
    "rows": [{
        "line": int,              # 1-based line in the file
        "date": "YYYY-MM-DD",
        "amount_cents": int,      # signed; negative is money out
        "kind": str,              # bank's own type, e.g. "Visa Purchase"
        "merchant": str,          # store or payee, cleaned for display
        "notes": str,             # every other field, joined
        "card_last4": str | None,
        "foreign_amount": str | None,
        "conversion_charge_cents": int | None,
        "fingerprint": str,       # stable row identity for deduplication
    }],
    "errors": [{"line": int, "message": str}],  # unreadable rows; never fatal
}
```

Raises `ValueError` for an empty file or an unrecognized format.

`fingerprint` is the raw fields plus the count of identical rows before it, so two real same-day purchases stay distinct while an overlapping re-export reproduces the same values. The server hashes it with the user and account into `transactions.hash`.

Adding a bank: add a module under `src/import/` with a header detector and a row parser, and register it in `parse_statement`. Test fixtures must be anonymised (see `src/import/fixtures/`).

## Export Modes

### CSV

- `export_csv(rows, currency)` writes transaction CSV bytes
- `export_accounts_csv(rows)` writes account CSV bytes
- `export_categories_csv(rows)` writes category CSV bytes
- `export_csv_full_dump(transactions, accounts, categories)` writes a ZIP archive containing separate CSV files

### XLSX

`export_xlsx(rows, sheets, currency)` has multiple modes:

- Transactions export:
  - pass transaction rows in `rows`
  - pass an empty `sheets` dict
- Accounts export:
  - pass `sheets={"accounts": [...]}`
- Categories export:
  - pass `sheets={"categories": [...]}`
- Full dump:
  - pass transaction rows in `rows`
  - pass `sheets={"accounts": [...], "categories": [...]}`

### PDF

`export_pdf(rows, meta)` switches behavior by `meta["scope"]`.

Expected `meta` shape:

```python
{
    "title": str,
    "currency": str,
    "scope": "transactions" | "accounts" | "categories" | "full_dump",
}
```

Behavior:

- `transactions`: renders a ledger-style transaction report
- `accounts`: renders an account summary report
- `categories`: renders a category summary report
- `full_dump`: rejected with a `ValueError`

PDF full dumps are intentionally not supported. If you need a complete export, use CSV or XLSX.

## Local Development

### Build and install into the active Python environment

From this directory:

```bash
maturin develop
```

That compiles the Rust extension and installs `scribe` into the currently active virtualenv.

### Build wheels

```bash
maturin build
```

### Run Rust tests

```bash
cargo test
```

## Packaging Notes

- crate name: `scribe`
- Python module name: `scribe`
- build backend: `maturin`
- PyO3 uses `abi3` for Python 3.11+ compatibility

Relevant files:

- [Cargo.toml](/Users/someone/Documents/repos/cofr/apps/scribe/Cargo.toml)
- [pyproject.toml](/Users/someone/Documents/repos/cofr/apps/scribe/pyproject.toml)

## Server Integration

The server imports `scribe` in [export_service.py](/Users/someone/Documents/repos/cofr/apps/server/app/services/export_service.py) and uses it as the rendering layer after SQLAlchemy has already collected and shaped the data.

The intended boundary is:

- Python/server side:
  - query data
  - apply request filters
  - shape rows as dicts
  - persist/export job state
- Rust/`scribe` side:
  - validate/coerce row input
  - render file bytes

That separation is important. `scribe` should stay a deterministic serialization/rendering crate, not become a second application layer.

## Current Gaps

- input extraction is permissive and may hide bad upstream data
- the API is dict-based, which is easy to bridge from Python but weakly typed at the boundary

If the crate grows, the next sensible hardening steps are:

- explicit validation errors for required fields
- clearer schema/versioning at the Python boundary
- snapshot-style tests for rendered CSV/XLSX/PDF outputs
