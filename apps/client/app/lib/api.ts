import { getToken, removeToken } from "./auth";
import {
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

// Expenses Endpoints
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

// Account / Provider Linking
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

// Preferences
export async function getPreferences(): Promise<{ preferred_currency: string }> {
  const response = await fetchWithAuth("/account/preferences");
  return response.json();
}

export async function updatePreferences(data: {
  preferred_currency: string;
}): Promise<{ preferred_currency: string }> {
  const response = await fetchWithAuth("/account/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

// Health check (no auth required)
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
