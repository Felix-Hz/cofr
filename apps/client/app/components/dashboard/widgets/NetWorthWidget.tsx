import { useDashboardLifetimeStats } from "~/lib/dashboard/data-context";
import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { formatCurrency } from "~/lib/utils";

export function NetWorthWidget({ widget }: WidgetRenderProps) {
  const lifetimeStats = useDashboardLifetimeStats();
  const { net_worth, lifetime_income, lifetime_spent, currency } = lifetimeStats;
  const isCompact = widget.row_span <= 1;
  const valueClass = isCompact
    ? "text-[clamp(1.5rem,5.4vw,1.9rem)] leading-none"
    : "text-[clamp(2rem,8vw,2.75rem)] leading-[0.95] sm:text-4xl";

  return (
    <div
      className={`flex h-full flex-col ${isCompact ? "gap-2.5 p-3.5" : "justify-between gap-4 p-5"}`}
    >
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
        <div className={`font-bold tracking-tight text-content-primary tabular-nums ${valueClass}`}>
          {formatCurrency(net_worth, currency, true, 0)}
        </div>
        {!isCompact && (
          <p className="mt-1 max-w-[18rem] text-xs leading-5 text-content-tertiary">
            All-time across every account
          </p>
        )}
      </div>
      <div
        className={`mt-auto grid text-xs ${isCompact ? "grid-cols-2 gap-4 border-t border-edge-default/80 pt-2" : "grid-cols-2 gap-4 sm:flex sm:gap-6"}`}
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
            In
          </div>
          <div
            className={`${isCompact ? "text-[13px]" : "text-sm"} font-semibold text-positive-text-strong tabular-nums`}
          >
            {formatCurrency(lifetime_income, currency, true, 0)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
            Out
          </div>
          <div
            className={`${isCompact ? "text-[13px]" : "text-sm"} font-semibold text-negative-text tabular-nums`}
          >
            {formatCurrency(lifetime_spent, currency, true, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
