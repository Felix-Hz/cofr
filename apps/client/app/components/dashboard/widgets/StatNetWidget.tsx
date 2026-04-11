import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";
import { StatCardBase } from "./StatCardBase";

export function StatNetWidget() {
  const { periodStats } = useDashboardData();
  const net = periodStats.total_income - periodStats.total_spent;
  const pct = periodStats.total_income > 0 ? Math.round((net / periodStats.total_income) * 100) : 0;
  return (
    <StatCardBase
      label="Net"
      tone={net >= 0 ? "accent" : "negative"}
      icon={
        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
        </svg>
      }
      value={formatCurrency(net, periodStats.currency, true, 0)}
      trailing={
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            pct >= 0
              ? "bg-positive-bg text-positive-text-strong"
              : "bg-negative-bg text-negative-text"
          }`}
        >
          {pct >= 0 ? "+" : ""}
          {pct}%
        </span>
      }
    />
  );
}
