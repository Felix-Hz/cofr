from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import CategoryCreateRequest, CategorySchema, CategoryUpdateRequest
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategorySchema])
async def get_categories(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Get system + user's custom categories (merged, sorted by display_order)."""
    service = CategoryService(db)
    return await service.get_categories(user_id)


@router.post("/", response_model=CategorySchema, status_code=201)
async def create_category(
    data: CategoryCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Create a custom category (max 20 per user)."""
    service = CategoryService(db)
    return await service.create_category(user_id, data)


@router.put("/{category_id}", response_model=CategorySchema)
async def update_category(
    category_id: str,
    data: CategoryUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update a custom category (403 on system)."""
    service = CategoryService(db)
    return await service.update_category(user_id, category_id, data)


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Delete a custom category, reassign transactions to Miscellaneous."""
    service = CategoryService(db)
    return await service.delete_category(user_id, category_id)


@router.patch("/{category_id}/toggle")
async def toggle_category(
    category_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Toggle active state (system → user_category_preferences, custom → direct)."""
    service = CategoryService(db)
    return await service.toggle_category(user_id, category_id)
