import { useDashboardPeriodStats } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

export type PeriodStatWidgetType = "stat_income" | "stat_spent" | "stat_net" | "stat_savings_rate";

export type PeriodStatCell = {
  widgetType: PeriodStatWidgetType;
  label: string;
  value: string;
  tone: "positive" | "negative" | "accent" | "neutral";
  trailing?: string;
  footnote?: string;
};

export function usePeriodStatCells(): Record<PeriodStatWidgetType, PeriodStatCell> {
  const periodStats = useDashboardPeriodStats();
  const net = periodStats.total_income - periodStats.total_spent;
  const netPct =
    periodStats.total_income > 0 ? Math.round((net / periodStats.total_income) * 100) : 0;
  const savingsRate =
    periodStats.total_income > 0
      ? (periodStats.savings_net_change / periodStats.total_income) * 100
      : 0;

  return {
    stat_income: {
      widgetType: "stat_income",
      label: "Income",
      value: formatCurrency(periodStats.total_income, periodStats.currency, true, 0),
      tone: "positive",
      footnote: `${periodStats.transaction_count - periodStats.expense_count} transactions`,
    },
    stat_spent: {
      widgetType: "stat_spent",
      label: "Spent",
      value: formatCurrency(periodStats.total_spent, periodStats.currency, true, 0),
      tone: "negative",
      footnote: `${periodStats.expense_count} transactions`,
    },
    stat_net: {
      widgetType: "stat_net",
      label: "Net",
      value: formatCurrency(net, periodStats.currency, true, 0),
      trailing: `${netPct >= 0 ? "+" : ""}${netPct}%`,
      tone: net >= 0 ? "accent" : "negative",
    },
    stat_savings_rate: {
      widgetType: "stat_savings_rate",
      label: "Savings",
      value: `${savingsRate.toFixed(1)}%`,
      trailing: formatCurrency(periodStats.savings_net_change, periodStats.currency, true, 0),
      footnote: `${formatCurrency(periodStats.savings_net_change, periodStats.currency, true, 0)} saved`,
      tone: savingsRate >= 0 ? "positive" : "negative",
    },
  };
}

export function usePeriodStatCell(widgetType: PeriodStatWidgetType): PeriodStatCell {
  return usePeriodStatCells()[widgetType];
}
