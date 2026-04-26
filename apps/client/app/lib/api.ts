import { getToken, removeToken } from "./auth";
import {
  type Account,
  type AccountBalance,
  AccountBalanceSchema,
  type AccountCreate,
  AccountSchema,
  type AccountTrendResponse,
  AccountTrendResponseSchema,
  type Category,
  type CategoryCreate,
  CategorySchema,
  type CategoryUpdate,
  type DashboardBootstrapResponse,
  DashboardBootstrapResponseSchema,
  type DashboardLayoutResponse,
  DashboardLayoutResponseSchema,
  type DashboardLayoutUpdate,
  type Expense,
  type ExpenseCreate,
  type ExpenseDeleteResponse,
  ExpenseDeleteResponseSchema,
  ExpenseSchema,
  type ExpensesResponse,
  ExpensesResponseSchema,
  type ExpenseUpdate,
  type ExportCreate,
  type ExportHistoryResponse,
  ExportHistoryResponseSchema,
  type ExportJobResponse,
  ExportJobResponseSchema,
  type LifetimeStats,
  LifetimeStatsSchema,
  type MonthlyStats,
  MonthlyStatsSchema,
  type MonthlyTrendResponse,
  MonthlyTrendResponseSchema,
  type RecurringResponse,
  RecurringResponseSchema,
  type RecurringRule,
  type RecurringRuleCreate,
  type RecurringRuleDeleteResponse,
  RecurringRuleDeleteResponseSchema,
  RecurringRuleSchema,
  type RecurringRuleUpdate,
  type SparklineResponse,
  SparklineResponseSchema,
  type TransferCreate,
  type TransferResponse,
  TransferResponseSchema,
  type WeekdayHeatmapResponse,
  WeekdayHeatmapResponseSchema,
  WIDGET_TYPES,
} from "./schemas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5173";
const SUPPORTED_WIDGET_TYPES = new Set<string>(WIDGET_TYPES);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function sanitizeDashboardLayoutResponse(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;

  const layout = json as {
    spaces?: Array<{
      widgets?: Array<{ widget_type?: string }>;
    }>;
  };

  if (!Array.isArray(layout.spaces)) return json;

  return {
    ...layout,
    spaces: layout.spaces.map((space) => ({
      ...space,
      widgets: Array.isArray(space.widgets)
        ? space.widgets.filter(
            (widget) =>
              typeof widget?.widget_type === "string" &&
              SUPPORTED_WIDGET_TYPES.has(widget.widget_type),
          )
        : [],
    })),
  };
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - token expired or invalid
  if (response.status === 401) {
    removeToken();
    // In React Router 7, we can throw a redirect
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || "API request failed");
  }

  return response;
}

// ── Categories ──

export async function getCategories(): Promise<Category[]> {
  const response = await fetchWithAuth("/categories/");
  const json = await response.json();
  return json.map((c: unknown) => CategorySchema.parse(c));
}

export async function createCategory(data: CategoryCreate): Promise<Category> {
  const response = await fetchWithAuth("/categories/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return CategorySchema.parse(json);
}

export async function updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
  const response = await fetchWithAuth(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return CategorySchema.parse(json);
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`/categories/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function toggleCategory(id: string): Promise<{ is_active: boolean }> {
  const response = await fetchWithAuth(`/categories/${id}/toggle`, {
    method: "PATCH",
  });
  return response.json();
}

// ── Accounts ──

export async function getAccounts(): Promise<Account[]> {
  const response = await fetchWithAuth("/accounts/");
  const json = await response.json();
  return json.map((a: unknown) => AccountSchema.parse(a));
}

export async function createAccount(data: AccountCreate): Promise<Account> {
  const response = await fetchWithAuth("/accounts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return AccountSchema.parse(json);
}

export async function updateAccount(id: string, data: { name?: string }): Promise<Account> {
  const response = await fetchWithAuth(`/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return AccountSchema.parse(json);
}

export async function deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`/accounts/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function moveTransactions(
  accountId: string,
  targetAccountId: string,
): Promise<{ success: boolean; moved_count: number }> {
  const response = await fetchWithAuth(`/accounts/${accountId}/move-transactions`, {
    method: "POST",
    body: JSON.stringify({ target_account_id: targetAccountId }),
  });
  return response.json();
}

export async function getAccountBalances(currency?: string): Promise<AccountBalance[]> {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/accounts/balances?${params}`);
  const json = await response.json();
  return json.map((b: unknown) => AccountBalanceSchema.parse(b));
}

// ── Expenses ──

export async function getExpenses(
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    collapseTransferPairs?: boolean;
  } = {},
): Promise<ExpensesResponse> {
  const params = new URLSearchParams({
    limit: (options.limit ?? 50).toString(),
    offset: (options.offset ?? 0).toString(),
  });

  if (options.startDate) params.set("start_date", options.startDate);
  if (options.endDate) params.set("end_date", options.endDate);
  if (options.category) params.set("category", options.category);
  if (options.minAmount !== undefined) params.set("min_amount", options.minAmount.toString());
  if (options.maxAmount !== undefined) params.set("max_amount", options.maxAmount.toString());
  if (options.collapseTransferPairs) params.set("collapse_transfer_pairs", "true");

  const response = await fetchWithAuth(`/expenses/?${params}`);
  const json = await response.json();
  return ExpensesResponseSchema.parse(json);
}

export async function getMonthlyStats(
  month: number,
  year: number,
  currency?: string,
): Promise<MonthlyStats> {
  const params = new URLSearchParams({
    month: month.toString(),
    year: year.toString(),
  });

  if (currency) {
    params.set("currency", currency);
  }

  const response = await fetchWithAuth(`/expenses/stats/monthly?${params}`);
  const json = await response.json();
  return MonthlyStatsSchema.parse(json);
}

export async function getRangeStats(
  startDate: string,
  endDate: string,
  currency?: string,
): Promise<MonthlyStats> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  if (currency) {
    params.set("currency", currency);
  }

  const response = await fetchWithAuth(`/expenses/stats/range?${params}`);
  const json = await response.json();
  return MonthlyStatsSchema.parse(json);
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  const response = await fetchWithAuth(`/expenses/`, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      created_at: data.created_at?.toISOString(),
    }),
  });
  const json = await response.json();
  return ExpenseSchema.parse(json);
}

export async function getExpense(id: string): Promise<Expense> {
  const response = await fetchWithAuth(`/expenses/${id}`);
  const json = await response.json();
  return ExpenseSchema.parse(json);
}

export async function updateExpense(id: string, data: ExpenseUpdate): Promise<Expense> {
  const response = await fetchWithAuth(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      created_at: data.created_at?.toISOString(),
    }),
  });
  const json = await response.json();
  return ExpenseSchema.parse(json);
}

export async function deleteExpense(id: string): Promise<ExpenseDeleteResponse> {
  const response = await fetchWithAuth(`/expenses/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();
  return ExpenseDeleteResponseSchema.parse(json);
}

// ── Transfers ──

export async function createTransfer(data: TransferCreate): Promise<TransferResponse> {
  const response = await fetchWithAuth(`/transfers/`, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      created_at: data.created_at?.toISOString(),
    }),
  });
  const json = await response.json();
  return TransferResponseSchema.parse(json);
}

export async function updateTransfer(id: string, data: TransferCreate): Promise<TransferResponse> {
  const response = await fetchWithAuth(`/transfers/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      created_at: data.created_at?.toISOString(),
    }),
  });
  const json = await response.json();
  return TransferResponseSchema.parse(json);
}

export async function deleteTransfer(id: string): Promise<ExpenseDeleteResponse> {
  const response = await fetchWithAuth(`/transfers/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();
  return ExpenseDeleteResponseSchema.parse(json);
}

// ── Recurring Rules ──

export async function listRecurringRules(): Promise<RecurringRule[]> {
  const response = await fetchWithAuth("/recurring/");
  const json = await response.json();
  return RecurringRuleSchema.array().parse(json);
}

export async function createRecurringRule(data: RecurringRuleCreate): Promise<RecurringRule> {
  const response = await fetchWithAuth("/recurring/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return RecurringRuleSchema.parse(json);
}

export async function updateRecurringRule(
  id: string,
  data: RecurringRuleUpdate,
): Promise<RecurringRule> {
  const response = await fetchWithAuth(`/recurring/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return RecurringRuleSchema.parse(json);
}

export async function toggleRecurringRule(id: string): Promise<RecurringRule> {
  const response = await fetchWithAuth(`/recurring/${id}/pause`, {
    method: "PATCH",
  });
  const json = await response.json();
  return RecurringRuleSchema.parse(json);
}

export async function deleteRecurringRule(id: string): Promise<RecurringRuleDeleteResponse> {
  const response = await fetchWithAuth(`/recurring/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();
  return RecurringRuleDeleteResponseSchema.parse(json);
}

export async function getRecurringRuleHistory(
  id: string,
  limit = 50,
  offset = 0,
): Promise<ExpensesResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await fetchWithAuth(`/recurring/${id}/history?${params}`);
  const json = await response.json();
  return ExpensesResponseSchema.parse(json);
}

// ── Account / Provider Linking ──

export async function getLinkedProviders(): Promise<
  {
    id: string;
    provider: string;
    provider_user_id: string;
    email: string | null;
    display_name: string | null;
  }[]
> {
  const response = await fetchWithAuth("/account/providers");
  return response.json();
}

export async function unlinkProvider(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`/account/providers/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// ── Preferences ──

export async function getPreferences(): Promise<{
  preferred_currency: string;
  session_timeout_minutes: number | null;
  default_account_id: string | null;
  timezone: string | null;
}> {
  const response = await fetchWithAuth("/account/preferences");
  return response.json();
}

export async function updatePreferences(data: {
  preferred_currency?: string;
  session_timeout_minutes?: number | null;
  default_account_id?: string;
  timezone?: string | null;
}): Promise<{
  preferred_currency: string;
  session_timeout_minutes: number | null;
  default_account_id: string | null;
  timezone: string | null;
}> {
  const response = await fetchWithAuth("/account/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

// ── Account Profile ──

export async function getUserProfile(): Promise<{
  preferred_currency: string;
  session_timeout_minutes: number | null;
}> {
  const response = await fetchWithAuth("/account/profile");
  return response.json();
}

// ── Exchange Rates ──

export async function getExchangeRates(): Promise<{
  rates: Record<string, number>;
  updated_at: string | null;
}> {
  const response = await fetchWithAuth("/exchange-rates/");
  return response.json();
}

// ── Local Auth (no auth required) ──

export async function registerWithEmail(
  email: string,
  password: string,
  name?: string,
): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: name || undefined, terms_accepted: true }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Registration failed" }));
    throw new ApiError(response.status, error.detail || "Registration failed");
  }
  return response.json();
}

export async function loginWithEmail(email: string, password: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }));
    throw new ApiError(response.status, error.detail || "Login failed");
  }
  return response.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/local/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Password reset failed" }));
    throw new ApiError(response.status, error.detail || "Password reset failed");
  }
  return response.json();
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/local/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unable to reset password" }));
    throw new ApiError(response.status, error.detail || "Unable to reset password");
  }
  return response.json();
}

// ── Password Management ──

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth("/account/password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return response.json();
}

// ── Account Deletion ──

export async function deleteUserAccount(
  mode: "soft" | "hard",
  confirmationText: string,
  password?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth("/account", {
    method: "DELETE",
    body: JSON.stringify({
      mode,
      confirmation_text: confirmationText,
      ...(password ? { password } : {}),
    }),
  });
  return response.json();
}

// ── Exports ──

export async function createExport(data: ExportCreate): Promise<ExportJobResponse> {
  const response = await fetchWithAuth("/exports", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      start_date: data.start_date?.toISOString(),
      end_date: data.end_date?.toISOString(),
    }),
  });
  const json = await response.json();
  return ExportJobResponseSchema.parse(json);
}

export async function getExportStatus(jobId: string): Promise<ExportJobResponse> {
  const response = await fetchWithAuth(`/exports/${jobId}/status`);
  const json = await response.json();
  return ExportJobResponseSchema.parse(json);
}

export function getExportStreamUrl(jobId: string): string {
  return `${API_BASE_URL}/exports/${jobId}/stream`;
}

export function getExportDownloadUrl(jobId: string): string {
  const token = getToken();
  return `${API_BASE_URL}/exports/${jobId}/download?token=${token}`;
}

export async function getExportHistory(limit = 15, offset = 0): Promise<ExportHistoryResponse> {
  const response = await fetchWithAuth(`/exports/history?limit=${limit}&offset=${offset}`);
  const json = await response.json();
  return ExportHistoryResponseSchema.parse(json);
}

export async function deleteExportRecord(exportId: string): Promise<void> {
  await fetchWithAuth(`/exports/history/${exportId}`, { method: "DELETE" });
}

export function getExportRecordDownloadUrl(exportId: string): string {
  const token = getToken();
  return `${API_BASE_URL}/exports/history/${exportId}/download?token=${token}`;
}

// ── Dashboard ──

export async function getDashboardLayout(): Promise<DashboardLayoutResponse> {
  const response = await fetchWithAuth("/dashboard/layout");
  const json = sanitizeDashboardLayoutResponse(await response.json());
  return DashboardLayoutResponseSchema.parse(json);
}

export async function getDashboardBootstrap(options: {
  startDate: string;
  endDate: string;
  currency?: string;
  limit?: number;
  offset?: number;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  months?: number;
  weeks?: number;
  days?: number;
  lookbackDays?: number;
  widgetTypes: string[];
}): Promise<DashboardBootstrapResponse> {
  const params = new URLSearchParams({
    start_date: options.startDate,
    end_date: options.endDate,
    limit: String(options.limit ?? 10),
    offset: String(options.offset ?? 0),
    months: String(options.months ?? 12),
    weeks: String(options.weeks ?? 8),
    days: String(options.days ?? 90),
    lookback_days: String(options.lookbackDays ?? 120),
  });
  if (options.currency) params.set("currency", options.currency);
  if (options.category) params.set("category", options.category);
  if (options.minAmount !== undefined) params.set("min_amount", options.minAmount.toString());
  if (options.maxAmount !== undefined) params.set("max_amount", options.maxAmount.toString());
  for (const widgetType of options.widgetTypes) {
    params.append("widget_type", widgetType);
  }
  const response = await fetchWithAuth(`/dashboard/bootstrap?${params}`);
  return DashboardBootstrapResponseSchema.parse(await response.json());
}

export async function updateDashboardLayout(
  payload: DashboardLayoutUpdate,
): Promise<DashboardLayoutResponse> {
  const response = await fetchWithAuth("/dashboard/layout", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const json = sanitizeDashboardLayoutResponse(await response.json());
  return DashboardLayoutResponseSchema.parse(json);
}

export async function getLifetimeStats(currency?: string): Promise<LifetimeStats> {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/expenses/stats/lifetime?${params}`);
  const json = await response.json();
  return LifetimeStatsSchema.parse(json);
}

export async function getSpendSparkline(
  startDate: string,
  endDate: string,
  currency?: string,
): Promise<SparklineResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/expenses/stats/sparkline?${params}`);
  const json = await response.json();
  return SparklineResponseSchema.parse(json);
}

export async function getMonthlyTrend(
  months = 12,
  currency?: string,
): Promise<MonthlyTrendResponse> {
  const params = new URLSearchParams({ months: String(months) });
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/dashboard/monthly-trend?${params}`);
  return MonthlyTrendResponseSchema.parse(await response.json());
}

export async function getWeekdayHeatmap(
  weeks = 8,
  currency?: string,
): Promise<WeekdayHeatmapResponse> {
  const params = new URLSearchParams({ weeks: String(weeks) });
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/dashboard/weekday-heatmap?${params}`);
  return WeekdayHeatmapResponseSchema.parse(await response.json());
}

export async function getAccountTrend(days = 90, currency?: string): Promise<AccountTrendResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/dashboard/account-trend?${params}`);
  return AccountTrendResponseSchema.parse(await response.json());
}

export async function getRecurring(
  lookbackDays = 120,
  currency?: string,
): Promise<RecurringResponse> {
  const params = new URLSearchParams({ lookback_days: String(lookbackDays) });
  if (currency) params.set("currency", currency);
  const response = await fetchWithAuth(`/dashboard/recurring?${params}`);
  return RecurringResponseSchema.parse(await response.json());
}

// ── Health check (no auth required) ──

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
