import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";
import { StatCardBase } from "./StatCardBase";

export function StatSpentWidget() {
  const { periodStats } = useDashboardData();
  return (
    <StatCardBase
      label="Spent"
      tone="negative"
      icon={
        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l6 6 4-4 8 8" />
        </svg>
      }
      value={formatCurrency(periodStats.total_spent, periodStats.currency, true, 0)}
      footnote={`${periodStats.expense_count} transactions`}
    />
  );
}
