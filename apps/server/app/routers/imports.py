from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import (
    ImportBatchSchema,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
)
from app.services.import_service import MAX_FILE_BYTES, ImportService

router = APIRouter(prefix="/imports", tags=["Imports"])


async def _read_upload(file: UploadFile) -> bytes:
    # Read one byte past the cap so oversize files are rejected without buffering them.
    data = await file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 2 MB)")
    return data


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    account_id: str | None = Form(default=None),
    currency: str | None = Form(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Parse a bank statement and report what importing it would do. Writes nothing."""
    data = await _read_upload(file)
    return await ImportService(db).preview(
        user_id, data, file.filename or "statement.csv", account_id, currency
    )


@router.post("/", response_model=ImportCommitResponse, status_code=201)
async def commit_import(
    file: UploadFile = File(...),
    payload: str = Form(...),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Import the chosen rows. `payload` is an ImportCommitRequest as JSON."""
    try:
        request = ImportCommitRequest.model_validate_json(payload)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors(include_url=False)) from e
    data = await _read_upload(file)
    return await ImportService(db).commit(user_id, data, file.filename or "statement.csv", request)


@router.get("/", response_model=list[ImportBatchSchema])
async def list_imports(
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return await ImportService(db).list_batches(user_id, limit)


@router.delete("/{batch_id}")
async def undo_import(
    batch_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Undo an import: removes every transaction it created."""
    removed = await ImportService(db).undo(user_id, batch_id)
    return {"success": True, "removed": removed}
