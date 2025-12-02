from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExpenseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float = Field(ge=0)
    category: str
    description: str
    created_at: datetime
    currency: str = Field(pattern="^[A-Z]{3}$")
    telegram_user_id: int

    @classmethod
    def from_row(cls, row: dict, telegram_id: int):
        """Transform database row to ExpenseSchema"""
        return cls(
            id=row["id"],
            amount=row["amount"],
            category=row["category"],
            description=row["notes"] or "",
            created_at=datetime.fromisoformat(row["timestamp"]),
            currency=row["currency"],
            telegram_user_id=telegram_id,
        )


class ExpensesResponse(BaseModel):
    expenses: list[ExpenseSchema]
    total_count: int
    limit: int
    offset: int


class CategoryTotal(BaseModel):
    category: str
    total: float
    count: int


class MonthlyStats(BaseModel):
    total_spent: float
    transaction_count: int
    category_breakdown: list[CategoryTotal]


class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
