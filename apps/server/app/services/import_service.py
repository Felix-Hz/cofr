"""Bank statement import: preview (parse + dedup + suggest) and commit.

Parsing lives in scribe (Rust). The flow is stateless: preview and commit both
re-parse the uploaded file, so the server never trusts client-sent amounts or dates
and needs no staging storage.

Deduplication has two layers:
- Exact: each row's hash is derived from scribe's per-row fingerprint plus user and
  account, stored in the unique `transactions.hash`. Re-importing overlapping
  statements is therefore idempotent.
- Fuzzy: rows that match a manually entered or recurring transaction (same account,
  direction and amount, within a few days) are flagged so the user can skip them.
"""

import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, date, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.db.models import Account, Category, ImportBatch, Transaction, User
from app.db.schemas import (
    ImportBatchSchema,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportDuplicateRef,
    ImportPreviewResponse,
    ImportPreviewRow,
    ImportRowError,
)
from app.services.category_service import visible_categories
from app.services.recurring_service import _occurrence_timestamp

try:
    import scribe

    _RUST_AVAILABLE = True
except ImportError:
    scribe = None
    _RUST_AVAILABLE = False

MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_ROWS = 20_000
DUPLICATE_WINDOW_DAYS = 3  # card purchases can post a few days after they happen
NOTES_MAX = 360
MERCHANT_MAX = 120

# First-import guesses, used only when the user's own history has no answer.
# Keys are system category slugs; patterns match merchant + notes, lowercased.
_RULES: list[tuple[str, re.Pattern[str]]] = [
    (slug, re.compile(pattern))
    for slug, pattern in [
        ("income", r"\b(salary|wages|payroll|interest|dividend)\b"),
        (
            "food-dining",
            r"countdown|woolworths|new world|pak ?n ?save|four square|fresh choice|supervalue"
            r"|\b(cafe|café|coffee|bakery|restaurant|sushi|pizza|burger|kfc|subway)\b"
            r"|mcdonald|uber ?eats|doordash|delivereasy|menulog",
        ),
        (
            "transport",
            r"^z |z energy|\b(bp|mobil|caltex|gull|npd|waitomo|parking|uber|taxi|lime|beam)\b"
            r"|at hop|petrol|fuel",
        ),
        (
            "bills-utilities",
            r"\b(spark|one nz|2degrees|vodafone|mercury|genesis|meridian|contact energy"
            r"|watercare|broadband|insurance|netflix|spotify|disney|youtube)\b|apple\.com",
        ),
        (
            "health-wellness",
            r"pharmacy|chemist|unichem|\b(doctor|medical|dental|dentist|physio|gym)\b",
        ),
        ("housing", r"\b(rent|mortgage|body corp|rates)\b"),
        ("travel", r"air nz|air new zealand|jetstar|airbnb|booking\.com|\b(hotel|motel)\b"),
        ("lifestyle", r"the warehouse|kmart|farmers|mitre 10|bunnings|cinema"),
    ]
]


def is_rust_available() -> bool:
    return _RUST_AVAILABLE


@dataclass
class ParsedStatement:
    source_format: str
    bank: str
    currency_hint: str | None
    account_ref: str | None
    rows: list[dict]
    errors: list[dict]


def parse_upload(data: bytes, filename: str) -> ParsedStatement:
    if not _RUST_AVAILABLE:
        raise HTTPException(status_code=503, detail="Import engine not available")
    if not data:
        raise HTTPException(status_code=422, detail="The file is empty")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 2 MB)")
    try:
        raw = scribe.parse_bank_csv(data, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if len(raw["rows"]) > MAX_ROWS:
        raise HTTPException(
            status_code=413, detail=f"Too many transactions (max {MAX_ROWS:,} per file)"
        )
    return ParsedStatement(
        source_format=raw["format"],
        bank=raw["bank"],
        currency_hint=raw["currency_hint"],
        account_ref=raw["account_ref"],
        rows=raw["rows"],
        errors=raw["errors"],
    )


def row_hash(user_id: str, account_id: str, fingerprint: str) -> str:
    digest = hashlib.sha256(f"{user_id}|{account_id}|{fingerprint}".encode()).hexdigest()
    return f"imp:{digest}"


def _direction(amount_cents: int) -> str:
    return "debit" if amount_cents < 0 else "credit"


def _category_fits(category_type: str, direction: str) -> bool:
    # Money in must land in an income category, money out in anything else.
    return (category_type == "income") == (direction == "credit")


def _user_tz(user: User | None) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone if user and user.timezone else "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    # ── Preview ──────────────────────────────────────────────────────────

    async def preview(
        self,
        user_id: str,
        data: bytes,
        filename: str,
        account_id: str | None,
        currency: str | None,
    ) -> ImportPreviewResponse:
        statement = parse_upload(data, filename)
        user = self.db.query(User).filter(User.id == user_id).first()

        previous = self._previous_batch(user_id, statement.account_ref)
        remembered = False
        if account_id:
            account = self._owned_account(user_id, account_id)
        elif previous and previous.account_id:
            account = self._owned_account(user_id, str(previous.account_id))
            remembered = True
        else:
            account = self._default_account(user, user_id)

        currency = (
            currency
            or (previous.currency if previous else None)
            or statement.currency_hint
            or (user.preferred_currency if user else "USD")
        )

        rows = statement.rows
        hashes = [row_hash(user_id, str(account.id), r["fingerprint"]) for r in rows]
        existing_hashes = self._existing_hashes(hashes)
        duplicates = self._match_possible_duplicates(
            user, user_id, str(account.id), currency, rows, hashes, existing_hashes
        )
        suggestions = self._suggest_categories(user_id, rows)

        preview_rows = []
        for i, (r, h) in enumerate(zip(rows, hashes, strict=True)):
            if h in existing_hashes:
                status = "already_imported"
            elif i in duplicates:
                status = "possible_duplicate"
            else:
                status = "new"
            category_id, source = suggestions[i]
            preview_rows.append(
                ImportPreviewRow(
                    index=i,
                    line=r["line"],
                    date=date.fromisoformat(r["date"]),
                    amount=abs(r["amount_cents"]) / 100,
                    direction=_direction(r["amount_cents"]),
                    kind=r["kind"],
                    merchant=r["merchant"][:MERCHANT_MAX],
                    notes=r["notes"][:NOTES_MAX],
                    status=status,
                    duplicate_of=duplicates.get(i),
                    suggested_category_id=category_id,
                    suggestion_source=source,
                )
            )

        dates = [date.fromisoformat(r["date"]) for r in rows]
        return ImportPreviewResponse(
            source_format=statement.source_format,
            bank=statement.bank,
            account_ref=statement.account_ref,
            filename=filename,
            date_from=min(dates) if dates else None,
            date_to=max(dates) if dates else None,
            account_id=str(account.id),
            account_remembered=remembered,
            currency=currency,
            rows=preview_rows,
            errors=[ImportRowError(**e) for e in statement.errors],
        )

    def _previous_batch(self, user_id: str, account_ref: str | None) -> ImportBatch | None:
        if not account_ref:
            return None
        return (
            self.db.query(ImportBatch)
            .filter(ImportBatch.user_id == user_id, ImportBatch.account_ref == account_ref)
            .order_by(ImportBatch.created_at.desc())
            .first()
        )

    def _owned_account(self, user_id: str, account_id: str) -> Account:
        try:
            uuid.UUID(account_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Account not found") from None
        account = (
            self.db.query(Account)
            .filter(Account.id == account_id, Account.user_id == user_id)
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return account

    def _default_account(self, user: User | None, user_id: str) -> Account:
        if user and user.default_account_id:
            account = self.db.get(Account, user.default_account_id)
            if account:
                return account
        account = (
            self.db.query(Account)
            .filter(Account.user_id == user_id)
            .order_by(Account.display_order)
            .first()
        )
        if not account:
            raise HTTPException(status_code=400, detail="Create an account before importing")
        return account

    def _existing_hashes(self, hashes: list[str]) -> set[str]:
        found: set[str] = set()
        # Chunked to stay well under database bind-parameter limits.
        for start in range(0, len(hashes), 1000):
            chunk = hashes[start : start + 1000]
            found.update(
                h for (h,) in self.db.query(Transaction.hash).filter(Transaction.hash.in_(chunk))
            )
        return found

    def _match_possible_duplicates(
        self,
        user: User | None,
        user_id: str,
        account_id: str,
        currency: str,
        rows: list[dict],
        hashes: list[str],
        existing_hashes: set[str],
    ) -> dict[int, ImportDuplicateRef]:
        """Pair new rows with non-imported transactions that look like the same event.

        One query for the whole date range; each existing transaction can absorb at
        most one row, and a row prefers the closest date.
        """
        pending = [i for i, h in enumerate(hashes) if h not in existing_hashes]
        if not pending:
            return {}

        tz = _user_tz(user)
        dates = [date.fromisoformat(rows[i]["date"]) for i in pending]
        window = timedelta(days=DUPLICATE_WINDOW_DAYS + 1)
        lo = _occurrence_timestamp(min(dates), user) - window
        hi = _occurrence_timestamp(max(dates), user) + window

        candidates = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel))
            .filter(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
                Transaction.currency == currency,
                Transaction.timestamp >= lo,
                Transaction.timestamp <= hi,
                # Rows imported from this account's own statements are authoritative, so
                # they never count as duplicates; transfer legs created on the other side
                # of an import ("imp-pair:") deliberately do.
                or_(Transaction.hash.is_(None), ~Transaction.hash.like("imp:%")),
            )
            .all()
        )

        by_key: dict[tuple[str, int], list[tuple[date, Transaction]]] = {}
        for tx in candidates:
            if tx.is_transfer:
                direction = "debit" if tx.transfer_direction == "from" else "credit"
            else:
                is_income = tx.category_rel is not None and tx.category_rel.type == "income"
                direction = "credit" if is_income else "debit"
            key = (direction, round(tx.amount * 100))
            ts = tx.timestamp if tx.timestamp.tzinfo else tx.timestamp.replace(tzinfo=UTC)
            local_date = ts.astimezone(tz).date()
            by_key.setdefault(key, []).append((local_date, tx))

        used: set[uuid.UUID] = set()
        matches: dict[int, ImportDuplicateRef] = {}
        for i, row_date in zip(pending, dates, strict=True):
            cents = rows[i]["amount_cents"]
            options = [
                (abs((d - row_date).days), d, tx)
                for d, tx in by_key.get((_direction(cents), abs(cents)), [])
                if tx.id not in used and abs((d - row_date).days) <= DUPLICATE_WINDOW_DAYS
            ]
            if not options:
                continue
            _, d, tx = min(options, key=lambda o: o[0])
            used.add(tx.id)
            matches[i] = ImportDuplicateRef(
                id=str(tx.id),
                date=d,
                amount=tx.amount,
                label=tx.merchant or tx.notes or "Transaction",
            )
        return matches

    def _suggest_categories(
        self, user_id: str, rows: list[dict]
    ) -> list[tuple[str | None, str | None]]:
        active = {str(c.id): c for c in _active_categories(self.db, user_id)}
        by_slug = {c.slug: c for c in active.values() if c.is_system}

        # The user's own history is the best predictor: most-used category per merchant.
        merchants = {r["merchant"].lower() for r in rows if r["merchant"]}
        history: dict[str, list[tuple[int, str]]] = {}
        if merchants:
            counts = (
                self.db.query(
                    func.lower(Transaction.merchant),
                    Transaction.category_id,
                    func.count(Transaction.id),
                )
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.is_transfer.is_(False),
                    Transaction.category_id.isnot(None),
                    func.lower(Transaction.merchant).in_(merchants),
                )
                .group_by(func.lower(Transaction.merchant), Transaction.category_id)
                .all()
            )
            for merchant, category_id, count in counts:
                history.setdefault(merchant, []).append((count, str(category_id)))
            for options in history.values():
                options.sort(reverse=True)

        out: list[tuple[str | None, str | None]] = []
        for r in rows:
            direction = _direction(r["amount_cents"])

            def fits(cid: str, direction: str = direction) -> bool:
                c = active.get(cid)
                return c is not None and _category_fits(c.type, direction)

            from_history = next(
                (cid for _, cid in history.get(r["merchant"].lower(), []) if fits(cid)), None
            )
            if from_history:
                out.append((from_history, "history"))
                continue

            haystack = f"{r['merchant']} {r['notes']}".lower()
            from_rule = next(
                (
                    str(by_slug[slug].id)
                    for slug, pattern in _RULES
                    if slug in by_slug and pattern.search(haystack) and fits(str(by_slug[slug].id))
                ),
                None,
            )
            if from_rule:
                out.append((from_rule, "rule"))
                continue

            fallback = by_slug.get("income" if direction == "credit" else "miscellaneous")
            if fallback and fits(str(fallback.id)):
                out.append((str(fallback.id), "default"))
            else:
                out.append((None, None))
        return out

    # ── Commit ───────────────────────────────────────────────────────────

    async def commit(
        self, user_id: str, data: bytes, filename: str, request: ImportCommitRequest
    ) -> ImportCommitResponse:
        statement = parse_upload(data, filename)
        user = self.db.query(User).filter(User.id == user_id).first()
        account = self._owned_account(user_id, request.account_id)
        account_id = str(account.id)

        decisions = {}
        for d in request.rows:
            if d.index >= len(statement.rows):
                raise HTTPException(status_code=422, detail=f"Row {d.index} is not in the file")
            if (d.category_id is None) == (d.transfer_account_id is None):
                raise HTTPException(
                    status_code=422,
                    detail=f"Row {d.index}: choose either a category or a transfer account",
                )
            decisions[d.index] = d

        visible = {str(c.id): c for c in _active_categories(self.db, user_id)}
        transfer_accounts: dict[str, Account] = {}
        for d in decisions.values():
            direction = _direction(statement.rows[d.index]["amount_cents"])
            if d.category_id is not None:
                cat = visible.get(d.category_id)
                if cat is None:
                    raise HTTPException(status_code=422, detail="Unknown category")
                if not _category_fits(cat.type, direction):
                    kind = "an income" if direction == "credit" else "a spending"
                    raise HTTPException(
                        status_code=422,
                        detail=f"Row {d.index}: {cat.name} is not {kind} category",
                    )
            elif d.transfer_account_id not in transfer_accounts:
                other = self._owned_account(user_id, d.transfer_account_id)
                if other.id == account.id:
                    raise HTTPException(
                        status_code=422, detail="Cannot transfer to the same account"
                    )
                transfer_accounts[d.transfer_account_id] = other

        hashes = {
            i: row_hash(user_id, account_id, statement.rows[i]["fingerprint"]) for i in decisions
        }
        # Re-check at commit time: makes double-submits and overlapping files harmless.
        already = self._existing_hashes(list(hashes.values()))

        batch = ImportBatch(
            id=uuid.uuid4(),
            user_id=user_id,
            account_id=account.id,
            source_format=statement.source_format,
            account_ref=statement.account_ref,
            filename=filename[:255],
            currency=request.currency,
        )
        self.db.add(batch)

        imported = transfers = 0
        imported_dates: list[date] = []
        pairs: list[tuple[Transaction, Transaction]] = []
        for i in sorted(decisions):
            if hashes[i] in already:
                continue
            d, r = decisions[i], statement.rows[i]
            row_date = date.fromisoformat(r["date"])
            common = {
                "user_id": user_id,
                "amount": abs(r["amount_cents"]) / 100,
                "currency": request.currency,
                "notes": r["notes"][:NOTES_MAX],
                "timestamp": _occurrence_timestamp(row_date, user),
                "import_batch_id": batch.id,
            }
            merchant = ((d.merchant if d.merchant is not None else r["merchant"]).strip())[
                :MERCHANT_MAX
            ] or None
            if d.category_id is not None:
                self.db.add(
                    Transaction(
                        **common,
                        account_id=account.id,
                        category_id=d.category_id,
                        merchant=merchant,
                        hash=hashes[i],
                    )
                )
            else:
                other = transfer_accounts[d.transfer_account_id]
                out_of_this = r["amount_cents"] < 0
                this_leg = Transaction(
                    **common,
                    account_id=account.id,
                    is_transfer=True,
                    transfer_direction="from" if out_of_this else "to",
                    hash=hashes[i],
                )
                other_leg = Transaction(
                    **common,
                    account_id=other.id,
                    is_transfer=True,
                    transfer_direction="to" if out_of_this else "from",
                    hash="imp-pair:" + hashes[i].removeprefix("imp:"),
                )
                self.db.add_all([this_leg, other_leg])
                pairs.append((this_leg, other_leg))
                transfers += 1
            imported += 1
            imported_dates.append(row_date)

        batch.imported_count = imported
        batch.skipped_count = len(statement.rows) - imported
        batch.date_from = min(imported_dates) if imported_dates else None
        batch.date_to = max(imported_dates) if imported_dates else None

        if pairs:
            # Legs reference each other, so they need ids in the database first.
            self.db.flush()
            for a, b in pairs:
                a.linked_transaction_id = b.id
                b.linked_transaction_id = a.id
        self.db.commit()

        return ImportCommitResponse(
            batch_id=str(batch.id),
            imported=imported,
            transfers=transfers,
            skipped=batch.skipped_count,
        )

    # ── History & undo ───────────────────────────────────────────────────

    async def list_batches(self, user_id: str, limit: int = 20) -> list[ImportBatchSchema]:
        rows = (
            self.db.query(ImportBatch, Account.name)
            .outerjoin(Account, Account.id == ImportBatch.account_id)
            .filter(ImportBatch.user_id == user_id)
            .order_by(ImportBatch.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            ImportBatchSchema(
                id=str(b.id),
                filename=b.filename,
                source_format=b.source_format,
                account_ref=b.account_ref,
                account_id=str(b.account_id) if b.account_id else None,
                account_name=account_name,
                currency=b.currency,
                imported_count=b.imported_count,
                skipped_count=b.skipped_count,
                date_from=b.date_from,
                date_to=b.date_to,
                created_at=b.created_at,
            )
            for b, account_name in rows
        ]

    async def undo(self, user_id: str, batch_id: str) -> int:
        """Delete every transaction the import created (both legs of transfers)."""
        try:
            uuid.UUID(batch_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Import not found") from None
        batch = (
            self.db.query(ImportBatch)
            .filter(ImportBatch.id == batch_id, ImportBatch.user_id == user_id)
            .first()
        )
        if not batch:
            raise HTTPException(status_code=404, detail="Import not found")
        batch_txs = self.db.query(Transaction).filter(
            Transaction.import_batch_id == batch.id, Transaction.user_id == user_id
        )
        # Break transfer links first so deletion order never trips the self-FK.
        batch_txs.update({Transaction.linked_transaction_id: None}, synchronize_session=False)
        removed = batch_txs.delete(synchronize_session=False)
        self.db.delete(batch)
        self.db.commit()
        return removed


def _active_categories(db: Session, user_id: str) -> list[Category]:
    """Categories the user can currently assign: their own plus visible system ones."""
    return [cat for cat, is_active in visible_categories(db, user_id) if is_active]
