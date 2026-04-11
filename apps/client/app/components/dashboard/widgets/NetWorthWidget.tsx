import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

/**
 * Hero-style card showing all-time net worth. Uses the `widget-surface--hero`
 * modifier on the parent shell so the emerald gradient flows through here.
 */
export function NetWorthWidget() {
  const { lifetimeStats } = useDashboardData();
  const { net_worth, lifetime_income, lifetime_spent, currency } = lifetimeStats;
  return (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
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
        <div className="text-4xl font-bold tracking-tight text-white tabular-nums">
          {formatCurrency(net_worth, currency, true, 0)}
        </div>
        <p className="mt-1 text-xs text-white/60">All-time across every account</p>
      </div>
      <div className="flex gap-6 text-xs">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">In</div>
          <div className="text-sm font-semibold text-white tabular-nums">
            {formatCurrency(lifetime_income, currency, true, 0)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Out
          </div>
          <div className="text-sm font-semibold text-white tabular-nums">
            {formatCurrency(lifetime_spent, currency, true, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
