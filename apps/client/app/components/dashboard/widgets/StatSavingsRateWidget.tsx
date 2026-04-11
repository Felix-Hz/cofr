import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";
import { StatCardBase } from "./StatCardBase";

export function StatSavingsRateWidget() {
  const { periodStats } = useDashboardData();
  const rate =
    periodStats.total_income > 0
      ? (periodStats.savings_net_change / periodStats.total_income) * 100
      : 0;
  return (
    <StatCardBase
      label="Savings rate"
      tone={rate >= 0 ? "positive" : "negative"}
      icon={
        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      }
      value={`${rate.toFixed(1)}%`}
      footnote={`${formatCurrency(periodStats.savings_net_change, periodStats.currency, true, 0)} saved`}
    />
  );
}
