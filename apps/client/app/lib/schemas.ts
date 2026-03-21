import { z } from "zod";

// ============================================================================
// Category Schemas
// ============================================================================

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color_light: z.string(),
  color_dark: z.string(),
  icon: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_system: z.boolean(),
  display_order: z.number(),
  type: z.string(),
  alias: z.string().nullable().optional(),
});

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(60),
  color_light: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  color_dark: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  type: z.enum(["expense", "income"]).default("expense"),
  alias: z.string().max(10).nullable().optional(),
});

export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color_light: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  color_dark: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  type: z.enum(["expense", "income"]).optional(),
  alias: z.string().max(10).nullable().optional(),
});

// ============================================================================
// Account Schemas
// ============================================================================

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  is_system: z.boolean(),
  display_order: z.number(),
});

export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["checking", "savings", "investment"]).default("checking"),
});

export const AccountBalanceSchema = z.object({
  account_id: z.string(),
  account_name: z.string(),
  account_type: z.string(),
  balance: z.number(),
});

// ============================================================================
// Expense Schemas
// ============================================================================

export const ExpenseSchema = z.object({
  id: z.string(),
  amount: z.number().min(0),
  category_id: z.string().nullable().optional(),
  category_name: z.string(),
  category_color_light: z.string(),
  category_color_dark: z.string(),
  category_type: z.string(),
  description: z.string(),
  created_at: z.coerce.date(),
  currency: z.string().length(3),
  is_opening_balance: z.boolean().default(false),
  account_id: z.string(),
  account_name: z.string(),
  is_transfer: z.boolean().default(false),
  linked_transaction_id: z.string().nullable().optional(),
  transfer_direction: z.string().nullable().optional(),
});

export const ExpensesResponseSchema = z.object({
  expenses: z.array(ExpenseSchema),
  total_count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const CategoryTotalSchema = z.object({
  category_id: z.string(),
  category: z.string(),
  category_type: z.string(),
  category_color_light: z.string(),
  category_color_dark: z.string(),
  total: z.number(),
  count: z.number(),
});

export const MonthlyStatsSchema = z.object({
  total_spent: z.number(),
  total_income: z.number(),
  transaction_count: z.number(),
  expense_count: z.number(),
  category_breakdown: z.array(CategoryTotalSchema),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
  account_balances: z.array(AccountBalanceSchema).default([]),
  savings_net_change: z.number().default(0),
});

export const ExpenseCreateSchema = z.object({
  amount: z.number().min(0),
  category_id: z.string(),
  description: z.string().default(""),
  currency: z.string().length(3).default("NZD"),
  created_at: z.coerce.date().optional(),
  is_opening_balance: z.boolean().default(false),
  account_id: z.string().optional(),
});

export const ExpenseUpdateSchema = z.object({
  amount: z.number().min(0).optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  currency: z.string().length(3).optional(),
  created_at: z.coerce.date().optional(),
  account_id: z.string().optional(),
});

export const ExpenseDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// Transfer Schemas
// ============================================================================

export const TransferCreateSchema = z.object({
  amount: z.number().min(0),
  from_account_id: z.string(),
  to_account_id: z.string(),
  description: z.string().default(""),
  currency: z.string().length(3).default("NZD"),
  created_at: z.coerce.date().optional(),
});

export const TransferResponseSchema = z.object({
  from_transaction: ExpenseSchema,
  to_transaction: ExpenseSchema,
});

// ============================================================================
// Infer TypeScript Types from Schemas (Single Source of Truth)
// ============================================================================

export type Category = z.infer<typeof CategorySchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type AccountCreate = z.infer<typeof AccountCreateSchema>;
export type AccountBalance = z.infer<typeof AccountBalanceSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpensesResponse = z.infer<typeof ExpensesResponseSchema>;
export type CategoryTotal = z.infer<typeof CategoryTotalSchema>;
export type MonthlyStats = z.infer<typeof MonthlyStatsSchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
export type ExpenseDeleteResponse = z.infer<typeof ExpenseDeleteResponseSchema>;
export type TransferCreate = z.infer<typeof TransferCreateSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;
