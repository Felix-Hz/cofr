from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ── Category Schemas ──


class CategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    color_light: str
    color_dark: str
    icon: str | None = None
    is_active: bool
    is_system: bool
    display_order: int
    type: str
    alias: str | None = None


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color_light: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    color_dark: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    type: str = Field(default="expense", pattern=r"^(expense|income)$")
    alias: str | None = Field(default=None, max_length=10)


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    color_light: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    color_dark: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    type: str | None = Field(default=None, pattern=r"^(expense|income)$")
    alias: str | None = Field(default=None, max_length=10)


# ── Account Schemas ──


class AccountSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    is_system: bool
    display_order: int


class AccountCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    type: str = Field(default="checking", pattern=r"^(checking|savings|investment)$")


class AccountUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)


class AccountBalance(BaseModel):
    account_id: str
    account_name: str
    account_type: str
    balance: float


# ── Expense Schemas ──


class ExpenseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: float = Field(ge=0)
    category_id: str | None = None
    category_name: str
    category_color_light: str
    category_color_dark: str
    category_type: str
    description: str
    created_at: datetime
    currency: str = Field(pattern="^[A-Z]{3}$")
    is_opening_balance: bool = False
    account_id: str
    account_name: str
    is_transfer: bool = False
    linked_transaction_id: str | None = None
    transfer_direction: str | None = None


class ExpensesResponse(BaseModel):
    expenses: list[ExpenseSchema]
    total_count: int
    limit: int
    offset: int


class CategoryTotal(BaseModel):
    category_id: str
    category: str
    category_type: str
    category_color_light: str
    category_color_dark: str
    total: float
    count: int


class MonthlyStats(BaseModel):
    total_spent: float
    total_income: float
    transaction_count: int
    expense_count: int
    category_breakdown: list[CategoryTotal]
    currency: str = Field(default="NZD", pattern="^[A-Z]{3}$")
    is_converted: bool = False
    account_balances: list[AccountBalance] = []


class ExpenseCreateRequest(BaseModel):
    amount: float = Field(ge=0)
    category_id: str
    description: str = Field(default="", max_length=360)
    currency: str = Field(default="NZD", pattern="^[A-Z]{3}$")
    created_at: datetime | None = None
    is_opening_balance: bool = False
    account_id: str | None = None


class ExpenseUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, ge=0)
    category_id: str | None = None
    description: str | None = Field(default=None, max_length=360)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    created_at: datetime | None = None
    is_opening_balance: bool | None = None
    account_id: str | None = None


class ExpenseDeleteResponse(BaseModel):
    success: bool
    message: str


# ── Transfer Schemas ──


class TransferCreateRequest(BaseModel):
    amount: float = Field(ge=0)
    from_account_id: str
    to_account_id: str
    description: str = Field(default="", max_length=360)
    currency: str = Field(default="NZD", pattern="^[A-Z]{3}$")
    created_at: datetime | None = None


class TransferResponse(BaseModel):
    from_transaction: ExpenseSchema
    to_transaction: ExpenseSchema
