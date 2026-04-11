import type { ComponentType } from "react";
import type { DashboardWidget, WidgetType } from "../schemas";

export type WidgetSizeConstraint = {
  minColSpan: number;
  maxColSpan: number;
  minRowSpan: number;
  maxRowSpan: number;
  defaultColSpan: number;
  defaultRowSpan: number;
};

export type WidgetCategory = "period" | "wealth" | "activity" | "insights";

export type WidgetMeta = {
  type: WidgetType;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  size: WidgetSizeConstraint;
  supportsFilterOverride: boolean;
};

export type WidgetRenderProps = {
  widget: DashboardWidget;
  isEditMode: boolean;
};

export type WidgetDefinition = WidgetMeta & {
  Component: ComponentType<WidgetRenderProps>;
};

const size = (
  col: number,
  row: number,
  opts?: Partial<WidgetSizeConstraint>,
): WidgetSizeConstraint => ({
  minColSpan: opts?.minColSpan ?? Math.max(3, Math.min(col, 6)),
  maxColSpan: opts?.maxColSpan ?? 12,
  minRowSpan: opts?.minRowSpan ?? 1,
  maxRowSpan: opts?.maxRowSpan ?? 6,
  defaultColSpan: col,
  defaultRowSpan: row,
});

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  period_stats_4up: {
    type: "period_stats_4up",
    title: "Period Stats",
    description: "Income, spent, net, and savings rate for the selected period.",
    category: "period",
    icon: "grid",
    size: size(12, 1, { minColSpan: 6 }),
    supportsFilterOverride: true,
  },
  stat_income: {
    type: "stat_income",
    title: "Income",
    description: "Total income for the selected period.",
    category: "period",
    icon: "trending-up",
    size: size(3, 1, { minColSpan: 3, maxColSpan: 6 }),
    supportsFilterOverride: true,
  },
  stat_spent: {
    type: "stat_spent",
    title: "Spent",
    description: "Total spend for the selected period.",
    category: "period",
    icon: "trending-down",
    size: size(3, 1, { minColSpan: 3, maxColSpan: 6 }),
    supportsFilterOverride: true,
  },
  stat_net: {
    type: "stat_net",
    title: "Net",
    description: "Income minus spend for the selected period.",
    category: "period",
    icon: "scale",
    size: size(3, 1, { minColSpan: 3, maxColSpan: 6 }),
    supportsFilterOverride: true,
  },
  stat_savings_rate: {
    type: "stat_savings_rate",
    title: "Savings rate",
    description: "Percent of income flowing into savings + investment.",
    category: "period",
    icon: "percent",
    size: size(3, 1, { minColSpan: 3, maxColSpan: 6 }),
    supportsFilterOverride: true,
  },
  category_pie: {
    type: "category_pie",
    title: "Category breakdown",
    description: "Spending by category for the selected period.",
    category: "insights",
    icon: "pie-chart",
    size: size(6, 3, { minColSpan: 4, minRowSpan: 2, maxRowSpan: 4 }),
    supportsFilterOverride: true,
  },
  account_balances: {
    type: "account_balances",
    title: "Account balances",
    description: "Live balance for every account.",
    category: "wealth",
    icon: "wallet",
    size: size(6, 2, { minColSpan: 4, minRowSpan: 1 }),
    supportsFilterOverride: false,
  },
  transactions: {
    type: "transactions",
    title: "Transactions",
    description: "Recent transactions table with inline edit.",
    category: "activity",
    icon: "list",
    size: size(12, 4, { minColSpan: 6, minRowSpan: 2, maxRowSpan: 8 }),
    supportsFilterOverride: true,
  },
  net_worth: {
    type: "net_worth",
    title: "Net worth",
    description: "All-time sum of every account balance.",
    category: "wealth",
    icon: "sparkles",
    size: size(6, 2, { minColSpan: 4, minRowSpan: 2 }),
    supportsFilterOverride: false,
  },
  savings_investment: {
    type: "savings_investment",
    title: "Savings and investments",
    description: "Lifetime savings and investment balances side by side.",
    category: "wealth",
    icon: "piggy-bank",
    size: size(6, 2, { minColSpan: 4, minRowSpan: 2 }),
    supportsFilterOverride: false,
  },
  spend_sparkline: {
    type: "spend_sparkline",
    title: "Spend pulse",
    description: "30-day daily spend sparkline.",
    category: "insights",
    icon: "activity",
    size: size(6, 2, { minColSpan: 4, minRowSpan: 2, maxRowSpan: 3 }),
    supportsFilterOverride: true,
  },
};

export const WIDGET_ORDER: readonly WidgetType[] = [
  "period_stats_4up",
  "stat_income",
  "stat_spent",
  "stat_net",
  "stat_savings_rate",
  "net_worth",
  "savings_investment",
  "account_balances",
  "category_pie",
  "spend_sparkline",
  "transactions",
];

export type DefaultLayoutWidget = {
  widget_type: WidgetType;
  col_x: number;
  col_y: number;
  col_span: number;
  row_span: number;
};

export const DEFAULT_LAYOUT: readonly DefaultLayoutWidget[] = [
  { widget_type: "period_stats_4up", col_x: 0, col_y: 0, col_span: 12, row_span: 1 },
  { widget_type: "net_worth", col_x: 0, col_y: 1, col_span: 4, row_span: 2 },
  { widget_type: "savings_investment", col_x: 4, col_y: 1, col_span: 4, row_span: 2 },
  { widget_type: "account_balances", col_x: 8, col_y: 1, col_span: 4, row_span: 2 },
  { widget_type: "transactions", col_x: 0, col_y: 3, col_span: 12, row_span: 4 },
];

type Registry = Record<WidgetType, WidgetDefinition>;

let registryInternal: Registry | null = null;

export function registerWidgets(
  components: Record<WidgetType, ComponentType<WidgetRenderProps>>,
): Registry {
  const entries = WIDGET_ORDER.map((type) => {
    const meta = WIDGET_META[type];
    const Component = components[type];
    if (!Component) {
      throw new Error(`Widget registry missing component for type "${type}"`);
    }
    return [type, { ...meta, Component }] as const;
  });
  registryInternal = Object.fromEntries(entries) as Registry;
  return registryInternal;
}

export function getRegistry(): Registry {
  if (!registryInternal) {
    throw new Error(
      "Dashboard widget registry not initialised. Call registerWidgets() before use.",
    );
  }
  return registryInternal;
}

export function getWidgetMeta(type: WidgetType): WidgetMeta {
  return WIDGET_META[type];
}

export function clampWidgetSize(
  type: WidgetType,
  colSpan: number,
  rowSpan: number,
): { colSpan: number; rowSpan: number } {
  const { size: c } = WIDGET_META[type];
  return {
    colSpan: Math.min(c.maxColSpan, Math.max(c.minColSpan, colSpan)),
    rowSpan: Math.min(c.maxRowSpan, Math.max(c.minRowSpan, rowSpan)),
  };
}
