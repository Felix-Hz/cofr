"""Recurring rule engine.

Cadence math is pure (no DB); materialization is idempotent via Transaction.hash.
"""

from calendar import monthrange
from collections.abc import Iterator
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session, joinedload

from app.db.models import Account, Category, RecurringRule, Transaction, User
from app.db.schemas import RecurringRuleSchema

# ── Cadence math (pure functions) ────────────────────────────────────────


def _add_months(d: date, months: int) -> date:
    """Add `months` to `d`, clamping day-of-month to the last valid day."""
    total = d.month - 1 + months
    year = d.year + total // 12
    month = total % 12 + 1
    last = monthrange(year, month)[1]
    day = min(d.day, last)
    return date(year, month, day)


def advance(rule_start: date, interval_unit: str, interval_count: int, from_date: date) -> date:
    """Return the next occurrence strictly after `from_date` on the rule's schedule.

    The cadence is anchored at `rule_start` so all occurrences stay aligned with
    the original day of week / day of month even across DST and leap years.
    """
    if interval_unit == "day":
        step = timedelta(days=interval_count)
        nxt = rule_start
        while nxt <= from_date:
            nxt = nxt + step
        return nxt
    if interval_unit == "week":
        step = timedelta(days=7 * interval_count)
        nxt = rule_start
        while nxt <= from_date:
            nxt = nxt + step
        return nxt
    if interval_unit == "month":
        k = 0
        while True:
            k += 1
            nxt = _add_months(rule_start, k * interval_count)
            if nxt > from_date:
                return nxt
    if interval_unit == "year":
        k = 0
        while True:
            k += 1
            nxt = _add_months(rule_start, k * 12 * interval_count)
            if nxt > from_date:
                return nxt
    raise ValueError(f"invalid interval_unit: {interval_unit}")


def first_occurrence(rule_start: date, today: date) -> date:
    """The rule's very first occurrence is its start_date."""
    # start_date is always the first eligible date; the caller decides whether
    # it has already passed and needs catch-up.
    return rule_start


def iter_due_occurrences(rule: RecurringRule, up_to: date) -> Iterator[date]:
    """Yield every occurrence from `rule.next_due_at` through `up_to` inclusive.

    Stops at `end_date` if set. Safe to call repeatedly; uses `next_due_at`
    as the cursor so already-materialized occurrences are skipped.
    """
    cursor = rule.next_due_at
    end = rule.end_date
    while cursor <= up_to:
        if end is not None and cursor > end:
            return
        yield cursor
        cursor = advance(rule.start_date, rule.interval_unit, rule.interval_count, cursor)


def preview_upcoming(rule: RecurringRule, count: int = 3) -> list[date]:
    """Next N occurrences from today's perspective, ignoring whether they've fired."""
    out: list[date] = []
    cursor = max(rule.next_due_at, rule.start_date)
    end = rule.end_date
    for _ in range(count):
        if end is not None and cursor > end:
            break
        out.append(cursor)
        cursor = advance(rule.start_date, rule.interval_unit, rule.interval_count, cursor)
    return out


# ── Timezone helpers ─────────────────────────────────────────────────────


def user_today(user: User | None) -> date:
    """Today in the user's timezone (falls back to UTC)."""
    tz_name = user.timezone if user and user.timezone else "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _occurrence_timestamp(occurrence: date, user: User | None) -> datetime:
    """Return a UTC-aware timestamp for an occurrence date in the user's tz."""
    tz_name = user.timezone if user and user.timezone else "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    local_noon = datetime.combine(occurrence, time(12, 0), tzinfo=tz)
    return local_noon.astimezone(UTC)


# ── Materialization ──────────────────────────────────────────────────────


def _transfer_pair_hash(rule_id, occurrence: date, leg: str) -> str:
    return f"rec:{rule_id}:{occurrence.isoformat()}:{leg}"


def _simple_hash(rule_id, occurrence: date) -> str:
    return f"rec:{rule_id}:{occurrence.isoformat()}"


def _materialize_expense_or_income(
    db: Session, rule: RecurringRule, occurrence: date, user: User | None
) -> Transaction | None:
    tx_hash = _simple_hash(rule.id, occurrence)
    existing = db.query(Transaction).filter(Transaction.hash == tx_hash).first()
    if existing:
        return None
    tx = Transaction(
        user_id=rule.user_id,
        amount=rule.amount,
        currency=rule.currency,
        category_id=rule.category_id,
        account_id=rule.account_id,
        notes=rule.description,
        merchant=rule.merchant,
        timestamp=_occurrence_timestamp(occurrence, user),
        hash=tx_hash,
        recurring_rule_id=rule.id,
    )
    db.add(tx)
    return tx


def _materialize_transfer(
    db: Session, rule: RecurringRule, occurrence: date, user: User | None
) -> tuple[Transaction, Transaction] | None:
    from_hash = _transfer_pair_hash(rule.id, occurrence, "from")
    if db.query(Transaction).filter(Transaction.hash == from_hash).first():
        return None
    ts = _occurrence_timestamp(occurrence, user)
    from_tx = Transaction(
        user_id=rule.user_id,
        amount=rule.amount,
        currency=rule.currency,
        notes=rule.description,
        timestamp=ts,
        account_id=rule.account_id,
        is_transfer=True,
        transfer_direction="from",
        category_id=None,
        hash=from_hash,
        recurring_rule_id=rule.id,
    )
    db.add(from_tx)
    db.flush()
    to_tx = Transaction(
        user_id=rule.user_id,
        amount=rule.amount,
        currency=rule.currency,
        notes=rule.description,
        timestamp=ts,
        account_id=rule.to_account_id,
        is_transfer=True,
        transfer_direction="to",
        linked_transaction_id=from_tx.id,
        category_id=None,
        hash=_transfer_pair_hash(rule.id, occurrence, "to"),
        recurring_rule_id=rule.id,
    )
    db.add(to_tx)
    db.flush()
    from_tx.linked_transaction_id = to_tx.id
    return from_tx, to_tx


def materialize_rule(db: Session, rule: RecurringRule, *, today: date) -> int:
    """Materialize all due occurrences up to `today`. Returns number created."""
    if not rule.is_active:
        return 0
    user = db.query(User).filter(User.id == rule.user_id).first()
    created = 0
    last_occurrence: date | None = None
    for occurrence in iter_due_occurrences(rule, up_to=today):
        if rule.type == "transfer":
            if rule.to_account_id is None:
                break
            result = _materialize_transfer(db, rule, occurrence, user)
        else:
            result = _materialize_expense_or_income(db, rule, occurrence, user)
        if result is not None:
            created += 1
        last_occurrence = occurrence

    if last_occurrence is not None:
        rule.last_materialized_at = last_occurrence
        # Advance cursor to the next un-materialized occurrence.
        rule.next_due_at = advance(
            rule.start_date, rule.interval_unit, rule.interval_count, last_occurrence
        )
        if rule.end_date and rule.next_due_at > rule.end_date:
            rule.is_active = False
    return created


def materialize_all_due(db: Session) -> int:
    """Scan every active rule and materialize anything due as of the user's today.

    Uses per-user today so a rule due 2026-04-14 fires when the owning user
    crosses midnight in their own timezone, not the server's.
    """
    total = 0
    rules = db.query(RecurringRule).filter(RecurringRule.is_active).all()
    if not rules:
        return 0
    # Cache per-user "today" to avoid recomputing tz math inside a hot loop.
    user_cache: dict = {}
    for rule in rules:
        today = user_cache.get(rule.user_id)
        if today is None:
            user = db.query(User).filter(User.id == rule.user_id).first()
            today = user_today(user)
            user_cache[rule.user_id] = today
        if rule.next_due_at <= today:
            total += materialize_rule(db, rule, today=today)
    if total:
        db.commit()
    return total


# ── Schema projection ────────────────────────────────────────────────────


def _join_account_names(db: Session, rule: RecurringRule) -> tuple[str | None, str | None]:
    names = (
        db.query(Account.id, Account.name)
        .filter(Account.id.in_([aid for aid in [rule.account_id, rule.to_account_id] if aid]))
        .all()
    )
    name_map = {str(aid): name for aid, name in names}
    return (
        name_map.get(str(rule.account_id)),
        name_map.get(str(rule.to_account_id)) if rule.to_account_id else None,
    )


def to_schema(db: Session, rule: RecurringRule) -> RecurringRuleSchema:
    account_name, to_account_name = _join_account_names(db, rule)
    cat = None
    if rule.category_id is not None:
        cat = db.query(Category).filter(Category.id == rule.category_id).first()
    return RecurringRuleSchema(
        id=str(rule.id),
        type=rule.type,
        name=rule.name,
        amount=rule.amount,
        currency=rule.currency,
        account_id=str(rule.account_id),
        account_name=account_name or "",
        to_account_id=str(rule.to_account_id) if rule.to_account_id else None,
        to_account_name=to_account_name,
        category_id=str(rule.category_id) if rule.category_id else None,
        category_name=cat.name if cat else None,
        category_color_light=cat.color_light if cat else None,
        category_color_dark=cat.color_dark if cat else None,
        merchant=rule.merchant,
        description=rule.description,
        interval_unit=rule.interval_unit,
        interval_count=rule.interval_count,
        day_of_month=rule.day_of_month,
        day_of_week=rule.day_of_week,
        start_date=rule.start_date,
        end_date=rule.end_date,
        next_due_at=rule.next_due_at,
        last_materialized_at=rule.last_materialized_at,
        is_active=rule.is_active,
        upcoming=preview_upcoming(rule, count=3),
    )


def list_rules(db: Session, user_id: str) -> list[RecurringRule]:
    return (
        db.query(RecurringRule)
        .filter(RecurringRule.user_id == user_id)
        .order_by(RecurringRule.is_active.desc(), RecurringRule.next_due_at.asc())
        .all()
    )


def get_rule_history(
    db: Session, user_id: str, rule_id: str, limit: int = 50, offset: int = 0
) -> tuple[list[Transaction], int]:
    base = (
        db.query(Transaction)
        .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
        .filter(Transaction.user_id == user_id, Transaction.recurring_rule_id == rule_id)
    )
    total = base.count()
    rows = (
        base.order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return rows, total
