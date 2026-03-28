import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.auth.jwt import verify_token
from app.database import SessionLocal, get_db
from app.db.models import User
from app.db.schemas import ExportCreateRequest, ExportJobResponse
from app.services.export_service import (
    ExportService,
    create_job,
    get_job,
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


@router.post("", status_code=202)
async def start_export(
    request: ExportCreateRequest,
    user_id: str = Depends(get_user_id),
):
    if not is_rust_available():
        raise HTTPException(status_code=503, detail="Export engine not available")

    if request.format == "pdf" and request.scope == "full_dump":
        raise HTTPException(
            status_code=400,
            detail="PDF export is not supported for full data dump. Use CSV or XLSX.",
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
    # Resolve user_id from Bearer header or query param token
    user_id = None

    if credentials:
        payload = verify_token(credentials.credentials)
        if payload:
            user_id = payload.get("user_id")
    elif token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("user_id")

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

    if not job.file_path:
        raise HTTPException(status_code=500, detail="Export file missing")

    # Determine file extension and media type
    suffix = job.format
    if job.format == "csv" and job.scope == "full_dump":
        suffix = "zip"
    media_type = MEDIA_TYPES.get(suffix, "application/octet-stream")
    date_str = job.created_at.strftime("%Y-%m-%d")
    filename = f"cofr-{job.scope.replace('_', '-')}-{date_str}.{suffix}"

    return FileResponse(
        path=job.file_path,
        media_type=media_type,
        filename=filename,
    )
