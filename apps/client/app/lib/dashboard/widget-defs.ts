export type WidgetCategory = "period" | "wealth" | "activity" | "insights";

type WidgetSizeSeed = {
  col: number;
  row: number;
  minColSpan?: number;
  maxColSpan?: number;
  minRowSpan?: number;
  maxRowSpan?: number;
};

export const WIDGET_TYPE_DEFS = [
  {
    type: "period_stats_4up",
    title: "Period Stats",
    description: "Income, spent, net, and savings rate for the selected period.",
    category: "period",
    icon: "grid",
    size: { col: 12, row: 1, minColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "stat_income",
    title: "Income",
    description: "Total income for the selected period.",
    category: "period",
    icon: "trending-up",
    size: { col: 3, row: 1, minColSpan: 3, maxColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "stat_spent",
    title: "Spent",
    description: "Total spend for the selected period.",
    category: "period",
    icon: "trending-down",
    size: { col: 3, row: 1, minColSpan: 3, maxColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "stat_net",
    title: "Net",
    description: "Income minus spend for the selected period.",
    category: "period",
    icon: "scale",
    size: { col: 3, row: 1, minColSpan: 3, maxColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "stat_savings_rate",
    title: "Savings rate",
    description: "Percent of income flowing into savings + investment.",
    category: "period",
    icon: "percent",
    size: { col: 3, row: 1, minColSpan: 3, maxColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "net_worth",
    title: "Net worth",
    description: "All-time sum of every account balance.",
    category: "wealth",
    icon: "sparkles",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2 },
    supportsFilterOverride: false,
  },
  {
    type: "savings_investment",
    title: "Savings and investments",
    description: "Lifetime savings and investment balances side by side.",
    category: "wealth",
    icon: "piggy-bank",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2 },
    supportsFilterOverride: false,
  },
  {
    type: "account_balances",
    title: "Account balances",
    description: "Live balance for every account.",
    category: "wealth",
    icon: "wallet",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 1 },
    supportsFilterOverride: false,
  },
  {
    type: "category_pie",
    title: "Category breakdown",
    description: "Spending by category for the selected period.",
    category: "insights",
    icon: "pie-chart",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 4 },
    supportsFilterOverride: true,
  },
  {
    type: "spend_sparkline",
    title: "Spend pulse",
    description: "30-day daily spend sparkline.",
    category: "insights",
    icon: "activity",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2, maxRowSpan: 3 },
    supportsFilterOverride: true,
  },
  {
    type: "transactions",
    title: "Transactions",
    description: "Recent transactions table with inline edit.",
    category: "activity",
    icon: "list",
    size: { col: 12, row: 4, minColSpan: 6, minRowSpan: 2, maxRowSpan: 8 },
    supportsFilterOverride: true,
  },
] as const satisfies readonly {
  type: string;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  size: WidgetSizeSeed;
  supportsFilterOverride: boolean;
}[];
