from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import DashboardLayoutResponse, DashboardLayoutUpdate
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/layout", response_model=DashboardLayoutResponse)
async def get_dashboard_layout(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Return the user's dashboard layout. Lazy-creates a default layout on first call."""
    return DashboardService(db).get_layout(user_id)


@router.put("/layout", response_model=DashboardLayoutResponse)
async def update_dashboard_layout(
    payload: DashboardLayoutUpdate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Replace the user's dashboard layout wholesale."""
    return DashboardService(db).replace_layout(user_id, payload)
