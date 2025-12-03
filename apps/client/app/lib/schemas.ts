import { z } from "zod";

// ============================================================================
// API Response Schemas
// ============================================================================

export const ExpenseSchema = z.object({
  id: z.number(),
  amount: z.number().min(0),
  category: z.string(),
  description: z.string(),
  created_at: z.coerce.date(),
  currency: z.string().length(3),
  telegram_user_id: z.number(),
});

export const ExpensesResponseSchema = z.object({
  expenses: z.array(ExpenseSchema),
  total_count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const CategoryTotalSchema = z.object({
  category: z.string(),
  total: z.number(),
  count: z.number(),
});

export const MonthlyStatsSchema = z.object({
  total_spent: z.number(),
  transaction_count: z.number(),
  category_breakdown: z.array(CategoryTotalSchema),
});

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const TelegramAuthDataSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

// ============================================================================
// Infer TypeScript Types from Schemas (Single Source of Truth)
// ============================================================================

// API Response Types
export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpensesResponse = z.infer<typeof ExpensesResponseSchema>;
export type CategoryTotal = z.infer<typeof CategoryTotalSchema>;
export type MonthlyStats = z.infer<typeof MonthlyStatsSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type TelegramAuthData = z.infer<typeof TelegramAuthDataSchema>;
