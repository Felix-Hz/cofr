from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.services.exchange_rates import get_rates_metadata, refresh_rates_in_db

router = APIRouter(prefix="/exchange-rates", tags=["Exchange Rates"])


@router.get("/")
async def get_exchange_rates(
    _user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Return all exchange rates with last-updated timestamp."""
    return get_rates_metadata(db)


@router.post("/refresh")
async def refresh_exchange_rates(
    _user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Trigger a manual refresh of exchange rates."""
    success = refresh_rates_in_db(db)
    return {"success": success}
