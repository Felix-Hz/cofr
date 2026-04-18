from datetime import date, datetime

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


class MoveTransactionsRequest(BaseModel):
    target_account_id: str


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
    merchant: str | None = None
    created_at: datetime
    currency: str = Field(pattern="^[A-Z]{3}$")
    is_opening_balance: bool = False
    account_id: str
    account_name: str
    is_transfer: bool = False
    linked_transaction_id: str | None = None
    linked_account_name: str | None = None
    transfer_direction: str | None = None
    recurring_rule_id: str | None = None


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
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False
    account_balances: list[AccountBalance] = []
    savings_net_change: float = 0.0


class LifetimeStats(BaseModel):
    """All-time totals: net worth (sum of balances), savings + investment separately, lifetime income/expense."""

    net_worth: float
    savings_balance: float
    investment_balance: float
    checking_balance: float
    lifetime_income: float
    lifetime_spent: float
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class SparklinePoint(BaseModel):
    date: str
    total: float


class SparklineResponse(BaseModel):
    points: list[SparklinePoint]
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class MonthlyTrendPoint(BaseModel):
    month: str  # YYYY-MM
    income: float
    spent: float


class MonthlyTrendResponse(BaseModel):
    points: list[MonthlyTrendPoint]
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class WeekdayHeatmapCell(BaseModel):
    weekday: int  # 0=Mon ... 6=Sun
    week: int  # 0=oldest week in window
    total: float


class WeekdayHeatmapResponse(BaseModel):
    cells: list[WeekdayHeatmapCell]
    weeks: int
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class AccountTrendPoint(BaseModel):
    date: str  # YYYY-MM-DD
    balance: float


class AccountTrendSeries(BaseModel):
    account_id: str
    account_name: str
    account_type: str
    color: str
    points: list[AccountTrendPoint]


class AccountTrendResponse(BaseModel):
    series: list[AccountTrendSeries]
    days: int
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class RecurringCharge(BaseModel):
    merchant: str
    amount: float
    currency: str
    cadence_days: float  # average spacing between occurrences
    occurrences: int
    last_seen: datetime
    next_expected: datetime | None = None
    category_name: str | None = None
    category_color_light: str | None = None
    category_color_dark: str | None = None


class RecurringResponse(BaseModel):
    charges: list[RecurringCharge]
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_converted: bool = False


class DashboardBootstrapResponse(BaseModel):
    preferred_currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    expenses: ExpensesResponse
    period_stats: MonthlyStats
    lifetime_stats: LifetimeStats
    account_balances: list[AccountBalance]
    sparkline: SparklineResponse
    monthly_trend: MonthlyTrendResponse
    weekday_heatmap: WeekdayHeatmapResponse
    account_trend: AccountTrendResponse
    recurring: RecurringResponse


class ExpenseCreateRequest(BaseModel):
    amount: float = Field(ge=0)
    category_id: str
    description: str = Field(default="", max_length=360)
    merchant: str | None = Field(default=None, max_length=120)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    created_at: datetime | None = None
    is_opening_balance: bool = False
    account_id: str | None = None


class ExpenseUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, ge=0)
    category_id: str | None = None
    description: str | None = Field(default=None, max_length=360)
    merchant: str | None = Field(default=None, max_length=120)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    created_at: datetime | None = None
    is_opening_balance: bool | None = None
    account_id: str | None = None


class UserProfileResponse(BaseModel):
    email_verified: bool


class ExpenseDeleteResponse(BaseModel):
    success: bool
    message: str


# ── Transfer Schemas ──


class TransferCreateRequest(BaseModel):
    amount: float = Field(ge=0)
    from_account_id: str
    to_account_id: str
    description: str = Field(default="", max_length=360)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    created_at: datetime | None = None


class TransferResponse(BaseModel):
    from_transaction: ExpenseSchema
    to_transaction: ExpenseSchema


# ── Recurring Rule Schemas ──


class RecurringRuleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    name: str
    amount: float
    currency: str
    account_id: str
    account_name: str
    to_account_id: str | None = None
    to_account_name: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    category_color_light: str | None = None
    category_color_dark: str | None = None
    merchant: str | None = None
    description: str
    interval_unit: str
    interval_count: int
    day_of_month: int | None = None
    day_of_week: int | None = None
    start_date: date
    end_date: date | None = None
    next_due_at: date
    last_materialized_at: date | None = None
    is_active: bool
    upcoming: list[date] = Field(default_factory=list)


class RecurringRuleCreateRequest(BaseModel):
    type: str = Field(pattern=r"^(expense|income|transfer)$")
    name: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0)
    currency: str = Field(pattern="^[A-Z]{3}$")
    account_id: str
    to_account_id: str | None = None
    category_id: str | None = None
    merchant: str | None = Field(default=None, max_length=120)
    description: str = Field(default="", max_length=360)
    interval_unit: str = Field(pattern=r"^(day|week|month|year)$")
    interval_count: int = Field(ge=1, le=366)
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_date: date
    end_date: date | None = None


class RecurringRuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    account_id: str | None = None
    to_account_id: str | None = None
    category_id: str | None = None
    merchant: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=360)
    interval_unit: str | None = Field(default=None, pattern=r"^(day|week|month|year)$")
    interval_count: int | None = Field(default=None, ge=1, le=366)
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class RecurringRuleDeleteResponse(BaseModel):
    success: bool
    message: str


# ── Export Schemas ──


class ExportCreateRequest(BaseModel):
    format: str = Field(pattern=r"^(csv|xlsx|pdf)$")
    scope: str = Field(pattern=r"^(transactions|accounts|categories|full_dump)$")
    name: str | None = Field(default=None, max_length=120)
    start_date: datetime | None = None
    end_date: datetime | None = None
    account_id: str | None = None
    category_id: str | None = None
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")


class ExportJobResponse(BaseModel):
    job_id: str
    status: str
    format: str
    scope: str
    created_at: datetime
    error: str | None = None
    export_id: str | None = None


class ExportRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    format: str
    scope: str
    file_size: int
    created_at: datetime
    expires_at: datetime


class ExportHistoryResponse(BaseModel):
    exports: list[ExportRecordSchema]
    total_count: int
    limit: int
    offset: int


# ── Dashboard Schemas ──


class DashboardWidgetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    widget_type: str
    col_x: int = Field(ge=0, le=11)
    col_y: int = Field(ge=0)
    col_span: int = Field(ge=1, le=12)
    row_span: int = Field(ge=1, le=12)
    config: dict | None = None


class DashboardSpaceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    position: int
    is_default: bool
    widgets: list[DashboardWidgetSchema]


class DashboardLayoutResponse(BaseModel):
    spaces: list[DashboardSpaceSchema]


class DashboardWidgetInput(BaseModel):
    widget_type: str = Field(min_length=1, max_length=40)
    col_x: int = Field(ge=0, le=11)
    col_y: int = Field(ge=0, le=99)
    col_span: int = Field(ge=1, le=12)
    row_span: int = Field(ge=1, le=12)
    config: dict | None = None


class DashboardSpaceInput(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=60)
    position: int = Field(ge=0)
    is_default: bool = False
    widgets: list[DashboardWidgetInput]


class DashboardLayoutUpdate(BaseModel):
    spaces: list[DashboardSpaceInput] = Field(min_length=1)
