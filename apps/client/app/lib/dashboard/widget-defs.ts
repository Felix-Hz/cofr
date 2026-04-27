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
    type: "top_categories_bars",
    title: "Top categories",
    description: "Ranked horizontal bars for the heaviest spend categories.",
    category: "insights",
    icon: "bar-chart",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 5 },
    supportsFilterOverride: true,
  },
  {
    type: "avg_daily_spend",
    title: "Avg / day",
    description: "Average daily spend for the selected period with projection.",
    category: "period",
    icon: "clock",
    size: { col: 3, row: 1, minColSpan: 3, maxColSpan: 6 },
    supportsFilterOverride: true,
  },
  {
    type: "monthly_trend_bars",
    title: "Monthly trend",
    description: "Income and spend bars for the last 12 months.",
    category: "insights",
    icon: "bar-chart-2",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 5 },
    supportsFilterOverride: false,
  },
  {
    type: "weekday_heatmap",
    title: "Weekday heatmap",
    description: "Spend intensity by weekday over the last 8 weeks.",
    category: "insights",
    icon: "calendar",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2, maxRowSpan: 3 },
    supportsFilterOverride: false,
  },
  {
    type: "account_trend",
    title: "Account trend",
    description: "Balance trajectory per account over the last 90 days.",
    category: "wealth",
    icon: "line-chart",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 5 },
    supportsFilterOverride: false,
  },
  {
    type: "recurring_subscriptions",
    title: "Recurring",
    description: "Detected subscriptions and recurring charges.",
    category: "activity",
    icon: "repeat",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 6 },
    supportsFilterOverride: false,
  },
  {
    type: "income_spend_compare",
    title: "Income vs spend",
    description: "Side-by-side comparison of income and spending this period.",
    category: "insights",
    icon: "compare",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2, maxRowSpan: 3 },
    supportsFilterOverride: true,
  },
  {
    type: "upcoming_recurring",
    title: "Upcoming recurring",
    description: "Next due dates from your recurring rules.",
    category: "activity",
    icon: "repeat",
    size: { col: 6, row: 2, minColSpan: 4, minRowSpan: 2, maxRowSpan: 6 },
    supportsFilterOverride: false,
  },
  {
    type: "budget_overview",
    title: "Budget overview",
    description: "All active budgets with progress bars for the current period.",
    category: "insights",
    icon: "target",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 6 },
    supportsFilterOverride: false,
  },
  {
    type: "budget_history",
    title: "Budget history",
    description: "Period-over-period budget performance for a selected budget.",
    category: "insights",
    icon: "bar-chart-2",
    size: { col: 6, row: 3, minColSpan: 4, minRowSpan: 2, maxRowSpan: 5 },
    supportsFilterOverride: false,
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
