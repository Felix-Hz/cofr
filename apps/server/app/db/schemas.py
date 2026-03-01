from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExpenseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: float = Field(ge=0)
    category: str
    description: str
    created_at: datetime
    currency: str = Field(pattern="^[A-Z]{3}$")


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
    total_income: float
    total_savings: float
    total_investment: float
    transaction_count: int
    expense_count: int
    category_breakdown: list[CategoryTotal]
    currency: str = Field(default="NZD", pattern="^[A-Z]{3}$")


class ExpenseCreateRequest(BaseModel):
    amount: float = Field(ge=0)
    category: str
    description: str = Field(default="", max_length=360)
    currency: str = Field(default="NZD", pattern="^[A-Z]{3}$")
    created_at: datetime | None = None


class ExpenseUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, ge=0)
    category: str | None = None
    description: str | None = Field(default=None, max_length=360)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    created_at: datetime | None = None


class ExpenseDeleteResponse(BaseModel):
    success: bool
    message: str
