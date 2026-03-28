import asyncio
import json
import re
import unicodedata
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import s3 as s3_mod
from app.auth.dependencies import get_user_id
from app.auth.jwt import verify_token
from app.database import SessionLocal, get_db
from app.db.models import Export as ExportRecord
from app.db.models import User
from app.db.schemas import (
    ExportCreateRequest,
    ExportHistoryResponse,
    ExportJobResponse,
    ExportRecordSchema,
)
from app.services.export_service import (
    USER_STORAGE_CAP_BYTES,
    ExportService,
    create_job,
    get_job,
    get_user_storage_bytes,
    is_rust_available,
)

router = APIRouter(prefix="/exports", tags=["exports"])

# Optional bearer - does not raise 403 when absent
_optional_bearer = HTTPBearer(auto_error=False)

MEDIA_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
    "zip": "application/zip",
}

_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9._ -]+")
_SEPARATOR_RUNS = re.compile(r"[- ]+")


def _resolve_user_id(
    credentials: HTTPAuthorizationCredentials | None, token: str | None
) -> str | None:
    """Extract user_id from Bearer header or query param token."""
    jwt_token = None
    if credentials:
        jwt_token = credentials.credentials
    elif token:
        jwt_token = token

    if jwt_token:
        payload = verify_token(jwt_token)
        if payload:
            return payload.get("user_id")
    return None


def _export_extension(fmt: str, scope: str) -> str:
    if fmt == "csv" and scope == "full_dump":
        return "zip"
    return fmt


def _sanitize_filename_stem(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    sanitized = _UNSAFE_FILENAME_CHARS.sub("-", normalized.strip())
    sanitized = _SEPARATOR_RUNS.sub("-", sanitized)
    sanitized = sanitized.strip("._-")
    return sanitized or "export"


def _build_export_filename(name: str, fmt: str, scope: str) -> str:
    return f"{_sanitize_filename_stem(name)}.{_export_extension(fmt, scope)}"


# ── History endpoints (must be before /{job_id} to avoid path conflicts) ──


@router.get("/history")
async def export_history(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    total_count_col = func.count(ExportRecord.id).over()
    rows = (
        db.query(ExportRecord, total_count_col.label("_total"))
        .filter(ExportRecord.user_id == user_id)
        .order_by(ExportRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    if not rows:
        return ExportHistoryResponse(exports=[], total_count=0, limit=limit, offset=offset)

    total = rows[0]._total
    exports = [
        ExportRecordSchema(
            id=str(r.id),
            name=r.name,
            format=r.format,
            scope=r.scope,
            file_size=r.file_size,
            created_at=r.created_at,
            expires_at=r.expires_at,
        )
        for r, _ in rows
    ]
    return ExportHistoryResponse(exports=exports, total_count=total, limit=limit, offset=offset)


@router.get("/history/{export_id}/download")
async def download_export_record(
    export_id: str,
    token: str | None = Query(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
    db: Session = Depends(get_db),
):
    user_id = _resolve_user_id(credentials, token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    exists = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not exists:
        raise HTTPException(status_code=401, detail="Account not found or deactivated")

    record = (
        db.query(ExportRecord)
        .filter(ExportRecord.id == export_id, ExportRecord.user_id == user_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Export not found")

    if record.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Export has expired")

    if not s3_mod.is_s3_available():
        raise HTTPException(status_code=503, detail="Download service unavailable")

    filename = _build_export_filename(record.name, record.format, record.scope)
    url = s3_mod.presign_download(record.s3_key, filename)
    return RedirectResponse(url=url, status_code=307)


@router.delete("/history/{export_id}", status_code=204)
async def delete_export_record(
    export_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    record = (
        db.query(ExportRecord)
        .filter(ExportRecord.id == export_id, ExportRecord.user_id == user_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Export not found")

    if s3_mod.is_s3_available():
        try:
            s3_mod.delete(record.s3_key)
        except Exception:
            pass  # S3 delete is best-effort; DB row still gets removed

    db.delete(record)
    db.commit()


# ── Job-based endpoints (existing) ──


@router.post("", status_code=202)
async def start_export(
    request: ExportCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    if not is_rust_available():
        raise HTTPException(status_code=503, detail="Export engine not available")

    if request.format == "pdf" and request.scope == "full_dump":
        raise HTTPException(
            status_code=400,
            detail="PDF export is not supported for full data dump. Use CSV or XLSX.",
        )

    # Check per-user storage cap
    if s3_mod.is_s3_available():
        total = get_user_storage_bytes(db, user_id)
        if total >= USER_STORAGE_CAP_BYTES:
            raise HTTPException(
                status_code=409,
                detail="Export storage limit reached (100 MB). Delete old exports to free space.",
            )

    job = create_job(user_id, request)

    asyncio.get_running_loop().run_in_executor(None, _run_export_sync, job.id, user_id, request)

    return ExportJobResponse(
        job_id=job.id,
        status=job.status,
        format=job.format,
        scope=job.scope,
        created_at=job.created_at,
    )


def _run_export_sync(job_id: str, user_id: str, request: ExportCreateRequest):
    """Blocking export worker - runs in thread pool with its own DB session."""
    db = SessionLocal()
    try:
        service = ExportService(db)
        service.run_export(job_id, user_id, request)
    finally:
        db.close()


@router.get("/{job_id}/status")
async def export_status(
    job_id: str,
    user_id: str = Depends(get_user_id),
):
    job = get_job(job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=404, detail="Export job not found")

    return ExportJobResponse(
        job_id=job.id,
        status=job.status,
        format=job.format,
        scope=job.scope,
        created_at=job.created_at,
        error=job.error,
        export_id=job.export_id,
    )


@router.get("/{job_id}/stream")
async def export_stream(
    job_id: str,
    user_id: str = Depends(get_user_id),
):
    job = get_job(job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=404, detail="Export job not found")

    async def event_generator():
        last_status = None
        while True:
            current_job = get_job(job_id)
            if not current_job:
                yield f"data: {json.dumps({'status': 'error', 'error': 'Job not found'})}\n\n"
                break

            if current_job.status != last_status:
                last_status = current_job.status
                event = {
                    "status": current_job.status,
                    "job_id": current_job.id,
                }
                if current_job.error:
                    event["error"] = current_job.error
                if current_job.file_size:
                    event["file_size"] = current_job.file_size
                if current_job.export_id:
                    event["export_id"] = current_job.export_id
                yield f"data: {json.dumps(event)}\n\n"

            if current_job.status in ("done", "error"):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{job_id}/download")
async def export_download(
    job_id: str,
    token: str | None = Query(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
    db: Session = Depends(get_db),
):
    user_id = _resolve_user_id(credentials, token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify user is not soft-deleted
    exists = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not exists:
        raise HTTPException(status_code=401, detail="Account not found or deactivated")

    job = get_job(job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=404, detail="Export job not found")

    if job.status != "done":
        raise HTTPException(status_code=409, detail=f"Export not ready (status: {job.status})")

    if job.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Export has expired")

    if not job.file_path:
        raise HTTPException(status_code=500, detail="Export file missing")

    # If S3 upload succeeded, redirect to pre-signed URL
    if job.s3_key and s3_mod.is_s3_available():
        filename = _build_export_filename(job.name, job.format, job.scope)
        url = s3_mod.presign_download(job.s3_key, filename)
        return RedirectResponse(url=url, status_code=307)

    # Fallback: serve temp file directly (dev/test or S3 upload failed)
    suffix = _export_extension(job.format, job.scope)
    media_type = MEDIA_TYPES.get(suffix, "application/octet-stream")
    filename = _build_export_filename(job.name, job.format, job.scope)

    return FileResponse(
        path=job.file_path,
        media_type=media_type,
        filename=filename,
    )
