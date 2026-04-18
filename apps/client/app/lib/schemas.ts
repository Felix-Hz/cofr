import { z } from "zod";
import { WIDGET_TYPE_DEFS } from "./dashboard/widget-defs";

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
  merchant: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  currency: z.string().length(3),
  is_opening_balance: z.boolean().default(false),
  account_id: z.string(),
  account_name: z.string(),
  is_transfer: z.boolean().default(false),
  linked_transaction_id: z.string().nullable().optional(),
  linked_account_name: z.string().nullable().optional(),
  transfer_direction: z.string().nullable().optional(),
  recurring_rule_id: z.string().nullable().optional(),
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
  merchant: z.string().max(120).nullable().optional(),
  currency: z.string().length(3).default("USD"),
  created_at: z.coerce.date().optional(),
  is_opening_balance: z.boolean().default(false),
  account_id: z.string().optional(),
});

export const ExpenseUpdateSchema = z.object({
  amount: z.number().min(0).optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  merchant: z.string().max(120).nullable().optional(),
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
  currency: z.string().length(3).default("USD"),
  created_at: z.coerce.date().optional(),
});

export const TransferResponseSchema = z.object({
  from_transaction: ExpenseSchema,
  to_transaction: ExpenseSchema,
});

// ============================================================================
// Export Schemas
// ============================================================================

export const ExportCreateSchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]),
  scope: z.enum(["transactions", "accounts", "categories", "full_dump"]),
  name: z.string().max(120).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  account_id: z.string().optional(),
  category_id: z.string().optional(),
  currency: z.string().length(3).optional(),
});

export const ExportJobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  format: z.string(),
  scope: z.string(),
  created_at: z.coerce.date(),
  error: z.string().nullable().optional(),
  export_id: z.string().nullable().optional(),
});

export const ExportRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string(),
  scope: z.string(),
  file_size: z.number(),
  created_at: z.coerce.date(),
  expires_at: z.coerce.date(),
});

export const ExportHistoryResponseSchema = z.object({
  exports: z.array(ExportRecordSchema),
  total_count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// ============================================================================
// Lifetime + Sparkline Stats Schemas
// ============================================================================

export const LifetimeStatsSchema = z.object({
  net_worth: z.number(),
  savings_balance: z.number(),
  investment_balance: z.number(),
  checking_balance: z.number(),
  lifetime_income: z.number(),
  lifetime_spent: z.number(),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

export const SparklinePointSchema = z.object({
  date: z.string(),
  total: z.number(),
});

export const SparklineResponseSchema = z.object({
  points: z.array(SparklinePointSchema),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

// ── Analytics widget responses ──

export const MonthlyTrendPointSchema = z.object({
  month: z.string(),
  income: z.number(),
  spent: z.number(),
});

export const MonthlyTrendResponseSchema = z.object({
  points: z.array(MonthlyTrendPointSchema),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

export const WeekdayHeatmapCellSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  week: z.number().int().min(0),
  total: z.number(),
});

export const WeekdayHeatmapResponseSchema = z.object({
  cells: z.array(WeekdayHeatmapCellSchema),
  weeks: z.number().int(),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

export const AccountTrendPointSchema = z.object({
  date: z.string(),
  balance: z.number(),
});

export const AccountTrendSeriesSchema = z.object({
  account_id: z.string(),
  account_name: z.string(),
  account_type: z.string(),
  color: z.string(),
  points: z.array(AccountTrendPointSchema),
});

export const AccountTrendResponseSchema = z.object({
  series: z.array(AccountTrendSeriesSchema),
  days: z.number().int(),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

export const RecurringChargeSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  cadence_days: z.number(),
  occurrences: z.number().int(),
  last_seen: z.coerce.date(),
  next_expected: z.coerce.date().nullable().optional(),
  category_name: z.string().nullable().optional(),
  category_color_light: z.string().nullable().optional(),
  category_color_dark: z.string().nullable().optional(),
});

export const RecurringResponseSchema = z.object({
  charges: z.array(RecurringChargeSchema),
  currency: z.string().length(3),
  is_converted: z.boolean().default(false),
});

// ============================================================================
// Recurring Rule Schemas
// ============================================================================

export const RecurringTypeSchema = z.enum(["expense", "income", "transfer"]);
export const RecurringIntervalUnitSchema = z.enum(["day", "week", "month", "year"]);

export const RecurringRuleSchema = z.object({
  id: z.string(),
  type: RecurringTypeSchema,
  name: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  account_id: z.string(),
  account_name: z.string(),
  to_account_id: z.string().nullable().optional(),
  to_account_name: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  category_name: z.string().nullable().optional(),
  category_color_light: z.string().nullable().optional(),
  category_color_dark: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  description: z.string(),
  interval_unit: RecurringIntervalUnitSchema,
  interval_count: z.number().int().min(1),
  day_of_month: z.number().int().nullable().optional(),
  day_of_week: z.number().int().nullable().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  next_due_at: z.string(),
  last_materialized_at: z.string().nullable().optional(),
  is_active: z.boolean(),
  upcoming: z.array(z.string()).default([]),
});

export const RecurringRuleCreateSchema = z.object({
  type: RecurringTypeSchema,
  name: z.string().min(1).max(80),
  amount: z.number().positive(),
  currency: z.string().length(3),
  account_id: z.string(),
  to_account_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  merchant: z.string().max(120).nullable().optional(),
  description: z.string().max(360).default(""),
  interval_unit: RecurringIntervalUnitSchema,
  interval_count: z.number().int().min(1).max(366),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
});

export const RecurringRuleUpdateSchema = RecurringRuleCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const RecurringRuleDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// Dashboard Layout Schemas
// ============================================================================

// Keep the server allow-list aligned with these client definitions.
export const WIDGET_TYPES = WIDGET_TYPE_DEFS.map((def) => def.type) as [
  (typeof WIDGET_TYPE_DEFS)[number]["type"],
  ...(typeof WIDGET_TYPE_DEFS)[number]["type"][],
];

export const WidgetTypeSchema = z.enum(WIDGET_TYPES);

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  widget_type: WidgetTypeSchema,
  col_x: z.number().int().min(0).max(11),
  col_y: z.number().int().min(0),
  col_span: z.number().int().min(1).max(12),
  row_span: z.number().int().min(1).max(12),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const DashboardSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number().int().min(0),
  is_default: z.boolean(),
  widgets: z.array(DashboardWidgetSchema),
});

export const DashboardLayoutResponseSchema = z.object({
  spaces: z.array(DashboardSpaceSchema),
});

export const DashboardWidgetInputSchema = z.object({
  widget_type: WidgetTypeSchema,
  col_x: z.number().int().min(0).max(11),
  col_y: z.number().int().min(0),
  col_span: z.number().int().min(1).max(12),
  row_span: z.number().int().min(1).max(12),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const DashboardSpaceInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  position: z.number().int().min(0),
  is_default: z.boolean(),
  widgets: z.array(DashboardWidgetInputSchema),
});

export const DashboardLayoutUpdateSchema = z.object({
  spaces: z.array(DashboardSpaceInputSchema).min(1),
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
export type ExportCreate = z.infer<typeof ExportCreateSchema>;
export type ExportJobResponse = z.infer<typeof ExportJobResponseSchema>;
export type ExportRecord = z.infer<typeof ExportRecordSchema>;
export type ExportHistoryResponse = z.infer<typeof ExportHistoryResponseSchema>;
export type LifetimeStats = z.infer<typeof LifetimeStatsSchema>;
export type SparklinePoint = z.infer<typeof SparklinePointSchema>;
export type SparklineResponse = z.infer<typeof SparklineResponseSchema>;
export type MonthlyTrendPoint = z.infer<typeof MonthlyTrendPointSchema>;
export type MonthlyTrendResponse = z.infer<typeof MonthlyTrendResponseSchema>;
export type WeekdayHeatmapCell = z.infer<typeof WeekdayHeatmapCellSchema>;
export type WeekdayHeatmapResponse = z.infer<typeof WeekdayHeatmapResponseSchema>;
export type AccountTrendPoint = z.infer<typeof AccountTrendPointSchema>;
export type AccountTrendSeries = z.infer<typeof AccountTrendSeriesSchema>;
export type AccountTrendResponse = z.infer<typeof AccountTrendResponseSchema>;
export type RecurringCharge = z.infer<typeof RecurringChargeSchema>;
export type RecurringResponse = z.infer<typeof RecurringResponseSchema>;
export type RecurringRuleType = z.infer<typeof RecurringTypeSchema>;
export type RecurringIntervalUnit = z.infer<typeof RecurringIntervalUnitSchema>;
export type RecurringRule = z.infer<typeof RecurringRuleSchema>;
export type RecurringRuleCreate = z.infer<typeof RecurringRuleCreateSchema>;
export type RecurringRuleUpdate = z.infer<typeof RecurringRuleUpdateSchema>;
export type RecurringRuleDeleteResponse = z.infer<typeof RecurringRuleDeleteResponseSchema>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type DashboardSpace = z.infer<typeof DashboardSpaceSchema>;
export type DashboardLayoutResponse = z.infer<typeof DashboardLayoutResponseSchema>;
export type DashboardWidgetInput = z.infer<typeof DashboardWidgetInputSchema>;
export type DashboardSpaceInput = z.infer<typeof DashboardSpaceInputSchema>;
export type DashboardLayoutUpdate = z.infer<typeof DashboardLayoutUpdateSchema>;
