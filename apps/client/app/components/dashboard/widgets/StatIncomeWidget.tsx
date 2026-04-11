import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";
import { StatCardBase } from "./StatCardBase";

export function StatIncomeWidget() {
  const { periodStats } = useDashboardData();
  return (
    <StatCardBase
      label="Income"
      tone="positive"
      icon={
        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
        </svg>
      }
      value={formatCurrency(periodStats.total_income, periodStats.currency, true, 0)}
      footnote={`${periodStats.transaction_count - periodStats.expense_count} transactions`}
    />
  );
}
