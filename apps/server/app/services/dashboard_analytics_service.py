"""Analytics queries backing the composable dashboard widgets.

Keeps monthly-trend, weekday-heatmap, account-trend, and recurring-detection
queries out of the expense_service.py file, which is already large.
"""

from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session

from app.db.models import Account, Category, ExchangeRate, Transaction, User
from app.db.schemas import (
    AccountTrendPoint,
    AccountTrendResponse,
    AccountTrendSeries,
    MonthlyTrendPoint,
    MonthlyTrendResponse,
    RecurringCharge,
    RecurringResponse,
    WeekdayHeatmapCell,
    WeekdayHeatmapResponse,
)


def _resolve_currency(db: Session, user_id: str, override: str | None) -> tuple[str, bool]:
    if override:
        return override, False
    user = db.query(User).filter(User.id == user_id).first()
    return (user.preferred_currency if user else "NZD"), True


def _rate_map(db: Session) -> dict[str, float]:
    rows = db.query(ExchangeRate.currency_code, ExchangeRate.rate_to_usd).all()
    return {code: float(rate) for code, rate in rows if rate}


def _convert(amount: float, from_ccy: str, target_ccy: str, rates: dict[str, float]) -> float:
    if from_ccy == target_ccy:
        return amount
    src = rates.get(from_ccy)
    dst = rates.get(target_ccy)
    if not src or not dst:
        return amount
    return amount / src * dst


class DashboardAnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    # ── Monthly trend ────────────────────────────────────────────
    def get_monthly_trend(
        self, user_id: str, months: int = 12, currency: str | None = None
    ) -> MonthlyTrendResponse:
        resolved, is_converted = _resolve_currency(self.db, user_id, currency)
        now = datetime.now(UTC)
        # start of month (months-1) ago
        year = now.year
        month = now.month - (months - 1)
        while month <= 0:
            month += 12
            year -= 1
        start = datetime(year, month, 1, tzinfo=UTC)

        filters = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]
        if currency:
            filters.append(Transaction.currency == currency)

        rows = (
            self.db.query(
                Transaction.timestamp,
                Transaction.amount,
                Transaction.currency,
                Category.type,
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(*filters)
            .all()
        )

        rates = _rate_map(self.db) if is_converted else {}
        buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "spent": 0.0})
        for ts, amount, ccy, cat_type in rows:
            amt = float(amount)
            if is_converted:
                amt = _convert(amt, ccy, resolved, rates)
            key = f"{ts.year:04d}-{ts.month:02d}"
            if cat_type == "income":
                buckets[key]["income"] += amt
            elif cat_type == "expense":
                buckets[key]["spent"] += amt

        # Ensure every month in the window is represented.
        points: list[MonthlyTrendPoint] = []
        cursor_year, cursor_month = start.year, start.month
        for _ in range(months):
            key = f"{cursor_year:04d}-{cursor_month:02d}"
            bucket = buckets.get(key, {"income": 0.0, "spent": 0.0})
            points.append(
                MonthlyTrendPoint(month=key, income=bucket["income"], spent=bucket["spent"])
            )
            cursor_month += 1
            if cursor_month > 12:
                cursor_month = 1
                cursor_year += 1

        return MonthlyTrendResponse(points=points, currency=resolved, is_converted=is_converted)

    # ── Weekday heatmap ──────────────────────────────────────────
    def get_weekday_heatmap(
        self, user_id: str, weeks: int = 8, currency: str | None = None
    ) -> WeekdayHeatmapResponse:
        resolved, is_converted = _resolve_currency(self.db, user_id, currency)
        now = datetime.now(UTC)
        # Align to the most recent Monday to get stable week rows.
        today_weekday = now.weekday()  # 0=Mon
        most_recent_monday = (now - timedelta(days=today_weekday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        start = most_recent_monday - timedelta(weeks=weeks - 1)

        filters = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]
        if currency:
            filters.append(Transaction.currency == currency)

        rows = (
            self.db.query(Transaction.timestamp, Transaction.amount, Transaction.currency)
            .join(Category, Transaction.category_id == Category.id)
            .filter(*filters, Category.type == "expense")
            .all()
        )

        rates = _rate_map(self.db) if is_converted else {}
        grid: dict[tuple[int, int], float] = defaultdict(float)
        for ts, amount, ccy in rows:
            amt = float(amount)
            if is_converted:
                amt = _convert(amt, ccy, resolved, rates)
            days_since_start = (ts - start).days
            week_idx = max(min(days_since_start // 7, weeks - 1), 0)
            weekday = ts.weekday()
            grid[(week_idx, weekday)] += amt

        cells = [
            WeekdayHeatmapCell(week=w, weekday=d, total=grid[(w, d)])
            for w in range(weeks)
            for d in range(7)
        ]
        return WeekdayHeatmapResponse(
            cells=cells, weeks=weeks, currency=resolved, is_converted=is_converted
        )

    # ── Account trend ────────────────────────────────────────────
    def get_account_trend(
        self, user_id: str, days: int = 90, currency: str | None = None
    ) -> AccountTrendResponse:
        resolved, is_converted = _resolve_currency(self.db, user_id, currency)
        rates = _rate_map(self.db) if is_converted else {}

        now = datetime.now(UTC).replace(hour=23, minute=59, second=59, microsecond=0)
        end_date = now.date()
        start_date = end_date - timedelta(days=days - 1)

        accounts = (
            self.db.query(Account)
            .filter(Account.user_id == user_id)
            .order_by(Account.display_order, Account.name)
            .all()
        )
        if not accounts:
            return AccountTrendResponse(
                series=[], days=days, currency=resolved, is_converted=is_converted
            )

        # Preload every non-opening transaction; compute running balance per account.
        all_txs = (
            self.db.query(
                Transaction.account_id,
                Transaction.amount,
                Transaction.currency,
                Transaction.timestamp,
                Transaction.is_transfer,
                Transaction.transfer_direction,
                Category.type,
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_opening_balance == sa_false(),
            )
            .order_by(Transaction.timestamp.asc())
            .all()
        )

        # Opening balances per account (counted as day-0 starting point).
        opening_rows = (
            self.db.query(Transaction.account_id, Transaction.amount, Transaction.currency)
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_opening_balance == ~sa_false(),
            )
            .all()
        )
        opening_by_account: dict[str, float] = defaultdict(float)
        for acct_id, amount, ccy in opening_rows:
            amt = float(amount)
            if is_converted:
                amt = _convert(amt, ccy, resolved, rates)
            opening_by_account[str(acct_id)] += amt

        # Group txs by account, cumulative by date.
        by_account: dict[str, list[tuple[datetime, float]]] = defaultdict(list)
        for acct_id, amount, ccy, ts, is_transfer, direction, cat_type in all_txs:
            amt = float(amount)
            if is_converted:
                amt = _convert(amt, ccy, resolved, rates)
            if is_transfer:
                signed = amt if direction == "to" else -amt
            elif cat_type == "income":
                signed = amt
            else:
                signed = -amt
            by_account[str(acct_id)].append((ts, signed))

        series: list[AccountTrendSeries] = []
        date_range = [start_date + timedelta(days=i) for i in range(days)]

        for idx, account in enumerate(accounts):
            acct_id = str(account.id)
            running = opening_by_account.get(acct_id, 0.0)
            # Apply all transactions strictly before start_date up-front.
            tx_list = by_account.get(acct_id, [])
            cursor = 0
            while cursor < len(tx_list) and tx_list[cursor][0].date() < start_date:
                running += tx_list[cursor][1]
                cursor += 1

            points: list[AccountTrendPoint] = []
            for d in date_range:
                while cursor < len(tx_list) and tx_list[cursor][0].date() <= d:
                    running += tx_list[cursor][1]
                    cursor += 1
                points.append(AccountTrendPoint(date=d.isoformat(), balance=round(running, 2)))

            series.append(
                AccountTrendSeries(
                    account_id=acct_id,
                    account_name=account.name,
                    account_type=account.type,
                    color=_account_color(idx, account.type),
                    points=points,
                )
            )

        return AccountTrendResponse(
            series=series, days=days, currency=resolved, is_converted=is_converted
        )

    # ── Recurring detection ──────────────────────────────────────
    def get_recurring(
        self,
        user_id: str,
        lookback_days: int = 120,
        currency: str | None = None,
    ) -> RecurringResponse:
        resolved, is_converted = _resolve_currency(self.db, user_id, currency)
        rates = _rate_map(self.db) if is_converted else {}
        now = datetime.now(UTC)
        start = now - timedelta(days=lookback_days)

        rows = (
            self.db.query(
                Transaction.merchant,
                Transaction.amount,
                Transaction.currency,
                Transaction.timestamp,
                Category.name,
                Category.color_light,
                Category.color_dark,
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.timestamp >= start,
                Transaction.is_opening_balance == sa_false(),
                Transaction.is_transfer == sa_false(),
                Transaction.merchant.isnot(None),
                Category.type == "expense",
            )
            .order_by(Transaction.timestamp.asc())
            .all()
        )

        # Group by (merchant lowercased, amount rounded to nearest dollar, target currency)
        groups: dict[tuple[str, int], dict] = defaultdict(
            lambda: {
                "merchant": "",
                "occurrences": 0,
                "timestamps": [],
                "amount_sum": 0.0,
                "currency": resolved,
                "category_name": None,
                "category_color_light": None,
                "category_color_dark": None,
            }
        )
        for merchant, amount, ccy, ts, cat_name, col_l, col_d in rows:
            if not merchant:
                continue
            amt = float(amount)
            if is_converted:
                amt = _convert(amt, ccy, resolved, rates)
            key = (merchant.strip().lower(), round(amt))
            bucket = groups[key]
            if not bucket["merchant"]:
                bucket["merchant"] = merchant.strip()
                bucket["category_name"] = cat_name
                bucket["category_color_light"] = col_l
                bucket["category_color_dark"] = col_d
            bucket["occurrences"] += 1
            bucket["timestamps"].append(ts)
            bucket["amount_sum"] += amt

        charges: list[RecurringCharge] = []
        for bucket in groups.values():
            occ = bucket["occurrences"]
            if occ < 2:
                continue
            timestamps = sorted(bucket["timestamps"])
            gaps = [
                (timestamps[i] - timestamps[i - 1]).total_seconds() / 86400
                for i in range(1, len(timestamps))
            ]
            avg_gap = sum(gaps) / len(gaps) if gaps else 0.0
            # Accept weekly (5-9 days), monthly (25-35), yearly-ish (355-375).
            is_recurring = 5 <= avg_gap <= 9 or 25 <= avg_gap <= 35 or 355 <= avg_gap <= 375
            if not is_recurring:
                continue
            last = timestamps[-1]
            next_expected = last + timedelta(days=round(avg_gap))
            avg_amount = bucket["amount_sum"] / occ
            charges.append(
                RecurringCharge(
                    merchant=bucket["merchant"],
                    amount=round(avg_amount, 2),
                    currency=resolved,
                    cadence_days=round(avg_gap, 1),
                    occurrences=occ,
                    last_seen=last,
                    next_expected=next_expected,
                    category_name=bucket["category_name"],
                    category_color_light=bucket["category_color_light"],
                    category_color_dark=bucket["category_color_dark"],
                )
            )

        charges.sort(key=lambda c: c.next_expected or c.last_seen)
        return RecurringResponse(charges=charges, currency=resolved, is_converted=is_converted)


_ACCOUNT_PALETTE = [
    "#10b981",  # emerald
    "#3b82f6",  # blue
    "#f59e0b",  # amber
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#14b8a6",  # teal
    "#f43f5e",  # rose
    "#eab308",  # yellow
]


def _account_color(idx: int, account_type: str) -> str:
    return _ACCOUNT_PALETTE[idx % len(_ACCOUNT_PALETTE)]
