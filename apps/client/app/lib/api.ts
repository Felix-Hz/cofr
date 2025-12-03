import { getToken, removeToken } from "./auth";
import {
  ExpensesResponseSchema,
  MonthlyStatsSchema,
  TokenResponseSchema,
  type ExpensesResponse,
  type MonthlyStats,
  type TelegramAuthData,
  type TokenResponse,
} from "./schemas";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5173";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
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
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || "API request failed");
  }

  return response;
}

// Authentication
export async function authenticateWithTelegram(
  data: TelegramAuthData,
): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: "Authentication failed",
    }));
    throw new ApiError(response.status, error.detail);
  }

  const json = await response.json();
  return TokenResponseSchema.parse(json);
}

// Expenses Endpoints
export async function getExpenses(
  limit = 50,
  offset = 0,
): Promise<ExpensesResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetchWithAuth(`/expenses/?${params}`);
  const json = await response.json();
  return ExpensesResponseSchema.parse(json);
}

export async function getExpensesByCategory(
  category: string,
  limit = 50,
  offset = 0,
): Promise<ExpensesResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetchWithAuth(
    `/expenses/category/${encodeURIComponent(category)}?${params}`,
  );
  const json = await response.json();
  return ExpensesResponseSchema.parse(json);
}

export async function getExpensesByDateRange(
  startDate: Date,
  endDate: Date,
  limit = 50,
  offset = 0,
): Promise<ExpensesResponse> {
  const params = new URLSearchParams({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetchWithAuth(`/expenses/date-range?${params}`);
  const json = await response.json();
  return ExpensesResponseSchema.parse(json);
}

export async function getMonthlyStats(
  month: number,
  year: number,
): Promise<MonthlyStats> {
  const params = new URLSearchParams({
    month: month.toString(),
    year: year.toString(),
  });

  const response = await fetchWithAuth(`/expenses/stats/monthly?${params}`);
  const json = await response.json();
  return MonthlyStatsSchema.parse(json);
}

// Health check (no auth required)
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
