import { useMemo } from "react";
import { useRecurring } from "~/lib/recurring";
import { formatCurrency, formatDate } from "~/lib/utils";

export function UpcomingRecurringWidget() {
  const { rules, loading } = useRecurring();

  const upcoming = useMemo(() => {
    return rules
      .filter((r) => r.is_active)
      .slice()
      .sort((a, b) => a.next_due_at.localeCompare(b.next_due_at))
      .slice(0, 8);
  }, [rules]);

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 pb-3.5 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
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
              d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.34 5.34M4 15a8 8 0 0013.66 3.66"
            />
          </svg>
          Upcoming recurring
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          {upcoming.length} {upcoming.length === 1 ? "rule" : "rules"}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          Loading…
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center text-xs text-content-muted">
          No active recurring rules.
          <br />
          Create one in Settings → Recurring.
        </div>
      ) : (
        <ul className="mt-2.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {upcoming.map((rule) => {
            const tone =
              rule.type === "income"
                ? "bg-positive-bg text-positive-text-strong"
                : rule.type === "transfer"
                  ? "bg-accent-soft-bg text-accent-soft-text"
                  : "bg-surface-elevated text-content-secondary";
            return (
              <li
                key={rule.id}
                className="flex items-center gap-3 rounded-md border border-edge-default/70 bg-surface-elevated/55 px-2.5 py-1.5"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone}`}
                >
                  {rule.type[0]}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12px] font-medium leading-tight text-content-primary">
                    {rule.name}
                  </span>
                  <span className="truncate text-[10px] text-content-tertiary">
                    next {formatDate(rule.next_due_at, "mobile")}
                  </span>
                </div>
                <span className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-content-primary">
                  {formatCurrency(rule.amount, rule.currency, true, 0)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
