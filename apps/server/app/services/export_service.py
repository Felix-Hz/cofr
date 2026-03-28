import os
import tempfile
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import sentry_sdk
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import Account, Category, ExchangeRate, Transaction, User
from app.db.schemas import ExportCreateRequest

try:
    import scribe

    _RUST_AVAILABLE = True
except ImportError:
    scribe = None
    _RUST_AVAILABLE = False

JOB_TTL_MINUTES = 30


@dataclass
class ExportJob:
    id: str
    user_id: str
    status: str  # pending, querying, rendering, done, error
    format: str
    scope: str
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    file_path: str | None = None
    file_size: int | None = None
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(UTC) + timedelta(minutes=JOB_TTL_MINUTES)
    )


# Module-level in-memory job registry
_jobs: dict[str, ExportJob] = {}


def get_job(job_id: str) -> ExportJob | None:
    return _jobs.get(job_id)


def create_job(user_id: str, request: ExportCreateRequest) -> ExportJob:
    job = ExportJob(
        id=str(uuid.uuid4()),
        user_id=user_id,
        status="pending",
        format=request.format,
        scope=request.scope,
        created_at=datetime.now(UTC),
    )
    _jobs[job.id] = job
    return job


def cleanup_expired_jobs():
    now = datetime.now(UTC)
    expired = [jid for jid, job in _jobs.items() if job.expires_at < now]
    for jid in expired:
        job = _jobs.pop(jid, None)
        if job and job.file_path:
            try:
                os.unlink(job.file_path)
            except OSError:
                pass


def is_rust_available() -> bool:
    return _RUST_AVAILABLE


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def run_export(self, job_id: str, user_id: str, request: ExportCreateRequest):
        """Blocking worker function - runs in thread executor."""
        job = _jobs.get(job_id)
        if not job:
            return

        try:
            # Phase 1: Query data
            job.status = "querying"
            data = self._collect_data(user_id, request)

            # Phase 2: Render via Rust
            job.status = "rendering"
            file_bytes = self._serialize(data, request)

            # Phase 3: Write to temp file
            suffix = self._file_suffix(request.format, request.scope)
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=suffix, prefix="cofr-export-"
            ) as f:
                f.write(file_bytes)
                job.file_path = f.name
                job.file_size = len(file_bytes)

            job.status = "done"
            job.completed_at = datetime.now(UTC)

        except Exception as e:
            job.status = "error"
            job.error = str(e)
            with sentry_sdk.new_scope() as scope:
                scope.set_tag("export.format", request.format)
                scope.set_tag("export.scope", request.scope)
                scope.set_tag("export.status", job.status)
                scope.set_tag("export.job_id", job.id)
                scope.set_user({"id": user_id})
                scope.set_context(
                    "export_request",
                    {
                        "job_id": job.id,
                        "format": request.format,
                        "scope": request.scope,
                        "start_date": request.start_date.isoformat()
                        if request.start_date
                        else None,
                        "end_date": request.end_date.isoformat() if request.end_date else None,
                        "account_id": request.account_id,
                        "category_id": request.category_id,
                        "currency": request.currency,
                    },
                )
                sentry_sdk.capture_exception(e)

    def _collect_data(self, user_id: str, request: ExportCreateRequest) -> dict:
        result = {}

        if request.scope in ("transactions", "full_dump"):
            result["transactions"] = self._query_transactions(user_id, request)

        if request.scope in ("accounts", "full_dump"):
            result["accounts"] = self._query_accounts_summary(user_id)

        if request.scope in ("categories", "full_dump"):
            result["categories"] = self._query_categories_breakdown(user_id, request)

        return result

    def _query_transactions(self, user_id: str, request: ExportCreateRequest) -> list[dict]:
        query = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
            .filter(Transaction.user_id == user_id)
        )

        if request.start_date:
            query = query.filter(Transaction.timestamp >= request.start_date)
        if request.end_date:
            query = query.filter(Transaction.timestamp <= request.end_date)
        if request.account_id:
            query = query.filter(Transaction.account_id == request.account_id)
        if request.category_id:
            query = query.filter(Transaction.category_id == request.category_id)
        if request.currency:
            query = query.filter(Transaction.currency == request.currency)

        transactions = query.order_by(Transaction.timestamp.desc()).all()

        return [self._tx_to_dict(tx) for tx in transactions]

    def _query_accounts_summary(self, user_id: str) -> list[dict]:
        user = self.db.query(User).filter(User.id == user_id).first()
        preferred = user.preferred_currency if user else "NZD"

        target_rate = (
            self.db.query(ExchangeRate.rate_to_usd)
            .filter(ExchangeRate.currency_code == preferred)
            .scalar_subquery()
        )

        from sqlalchemy import case

        converted_amount = case(
            (
                ExchangeRate.rate_to_usd.isnot(None),
                Transaction.amount / ExchangeRate.rate_to_usd * target_rate,
            ),
            else_=Transaction.amount,
        )

        balance_subq = (
            self.db.query(
                Transaction.account_id,
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Transaction.is_transfer == True,  # noqa: E712
                                case(
                                    (Transaction.transfer_direction == "to", converted_amount),
                                    else_=-converted_amount,
                                ),
                            ),
                            (Category.type == "income", converted_amount),
                            else_=-converted_amount,
                        )
                    ),
                    0,
                ).label("balance"),
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .outerjoin(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
            .filter(Transaction.user_id == user_id)
            .group_by(Transaction.account_id)
            .subquery()
        )

        results = (
            self.db.query(
                Account.name,
                Account.type,
                func.coalesce(balance_subq.c.balance, 0).label("balance"),
            )
            .outerjoin(balance_subq, Account.id == balance_subq.c.account_id)
            .filter(Account.user_id == user_id)
            .order_by(Account.display_order)
            .all()
        )

        return [{"name": r.name, "type": r.type, "balance": float(r.balance)} for r in results]

    def _query_categories_breakdown(self, user_id: str, request: ExportCreateRequest) -> list[dict]:
        from sqlalchemy import false as sa_false

        filters = [
            Transaction.user_id == user_id,
            Transaction.is_transfer == sa_false(),
        ]
        if request.start_date:
            filters.append(Transaction.timestamp >= request.start_date)
        if request.end_date:
            filters.append(Transaction.timestamp <= request.end_date)
        if request.currency:
            filters.append(Transaction.currency == request.currency)

        rows = (
            self.db.query(
                Category.name,
                Category.type,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(*filters)
            .group_by(Category.name, Category.type)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        return [
            {"name": r.name, "type": r.type, "total": float(r.total), "count": r.count}
            for r in rows
        ]

    def _serialize(self, data: dict, request: ExportCreateRequest) -> bytes:
        fmt = request.format
        scope = request.scope

        if fmt == "csv":
            return self._serialize_csv(data, scope)
        elif fmt == "xlsx":
            return self._serialize_xlsx(data, scope, request.currency or "NZD")
        elif fmt == "pdf":
            return self._serialize_pdf(data, scope, request.currency or "NZD")
        else:
            raise ValueError(f"Unsupported format: {fmt}")

    def _serialize_csv(self, data: dict, scope: str) -> bytes:
        if scope == "full_dump":
            return scribe.export_csv_full_dump(
                data.get("transactions", []),
                data.get("accounts", []),
                data.get("categories", []),
            )
        elif scope == "transactions":
            return scribe.export_csv(data["transactions"], "")
        elif scope == "accounts":
            return scribe.export_accounts_csv(data["accounts"])
        elif scope == "categories":
            return scribe.export_categories_csv(data["categories"])
        else:
            raise ValueError(f"Unsupported scope: {scope}")

    def _serialize_xlsx(self, data: dict, scope: str, currency: str) -> bytes:
        if scope == "full_dump":
            return scribe.export_xlsx(
                data.get("transactions", []),
                {"accounts": data.get("accounts", []), "categories": data.get("categories", [])},
                currency,
            )
        elif scope == "transactions":
            return scribe.export_xlsx(data["transactions"], {}, currency)
        elif scope == "accounts":
            return scribe.export_xlsx([], {"accounts": data["accounts"]}, currency)
        elif scope == "categories":
            return scribe.export_xlsx([], {"categories": data["categories"]}, currency)
        else:
            raise ValueError(f"Unsupported scope: {scope}")

    def _serialize_pdf(self, data: dict, scope: str, currency: str) -> bytes:
        meta = {
            "title": f"Cofr - {scope.replace('_', ' ').title()}",
            "currency": currency,
            "scope": scope,
        }

        if scope == "transactions":
            return scribe.export_pdf(data["transactions"], meta)
        elif scope == "accounts":
            return scribe.export_pdf(data["accounts"], meta)
        elif scope == "categories":
            return scribe.export_pdf(data["categories"], meta)
        elif scope == "full_dump":
            raise ValueError("PDF export is not supported for full data dump. Use CSV or XLSX.")
        else:
            raise ValueError(f"Unsupported scope: {scope}")

    @staticmethod
    def _tx_to_dict(tx: Transaction) -> dict:
        cat = tx.category_rel
        account = tx.account_rel
        return {
            "date": tx.timestamp.isoformat() if tx.timestamp else "",
            "description": tx.notes or "",
            "amount": tx.amount,
            "currency": tx.currency,
            "category": cat.name if cat else "Transfer",
            "category_type": cat.type if cat else "transfer",
            "account": account.name if account else "",
            "account_type": account.type if account else "",
            "is_transfer": tx.is_transfer,
            "transfer_direction": tx.transfer_direction or "",
            "is_opening_balance": tx.is_opening_balance,
        }

    @staticmethod
    def _file_suffix(fmt: str, scope: str) -> str:
        if fmt == "csv" and scope == "full_dump":
            return ".zip"
        return f".{fmt}"
