import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

export function NetWorthWidget() {
  const { lifetimeStats } = useDashboardData();
  const { net_worth, lifetime_income, lifetime_spent, currency } = lifetimeStats;
  return (
    <div className="flex h-full flex-col justify-between gap-4 p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
        Net worth
      </div>
      <div>
        <div className="text-3xl font-bold tracking-tight text-content-primary tabular-nums sm:text-4xl">
          {formatCurrency(net_worth, currency, true, 0)}
        </div>
        <p className="mt-1 text-xs text-content-tertiary">All-time across every account</p>
      </div>
      <div className="flex gap-6 text-xs">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
            In
          </div>
          <div className="text-sm font-semibold text-positive-text-strong tabular-nums">
            {formatCurrency(lifetime_income, currency, true, 0)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
            Out
          </div>
          <div className="text-sm font-semibold text-negative-text tabular-nums">
            {formatCurrency(lifetime_spent, currency, true, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
