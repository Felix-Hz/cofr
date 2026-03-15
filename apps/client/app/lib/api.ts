import { getToken, removeToken } from "./auth";
import {
  type Account,
  type AccountBalance,
  AccountBalanceSchema,
  type AccountCreate,
  AccountSchema,
  type Category,
  type CategoryCreate,
  CategorySchema,
  type CategoryUpdate,
  type Expense,
  type ExpenseCreate,
  type ExpenseDeleteResponse,
  ExpenseDeleteResponseSchema,
  ExpenseSchema,
  type ExpensesResponse,
  ExpensesResponseSchema,
  type ExpenseUpdate,
  type MonthlyStats,
  MonthlyStatsSchema,
  type TransferCreate,
  type TransferResponse,
  TransferResponseSchema,
} from "./schemas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5173";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
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

export async function initTelegramLink(): Promise<{ code: string; deep_link: string }> {
  const response = await fetchWithAuth("/account/link/telegram/init", {
    method: "POST",
  });
  return response.json();
}

// ── Preferences ──

export async function getPreferences(): Promise<{
  preferred_currency: string;
  session_timeout_minutes: number | null;
  default_account_id: string | null;
}> {
  const response = await fetchWithAuth("/account/preferences");
  return response.json();
}

export async function updatePreferences(data: {
  preferred_currency?: string;
  session_timeout_minutes?: number | null;
  default_account_id?: string;
}): Promise<{
  preferred_currency: string;
  session_timeout_minutes: number | null;
  default_account_id: string | null;
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
    body: JSON.stringify({ email, password, name: name || undefined }),
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

// ── Health check (no auth required) ──

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
