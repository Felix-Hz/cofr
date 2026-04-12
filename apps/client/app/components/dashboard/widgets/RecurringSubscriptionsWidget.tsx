import { useMemo } from "react";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { useTheme } from "~/lib/theme";
import { formatCurrency, formatDate } from "~/lib/utils";

function cadenceLabel(days: number): string {
  if (days >= 5 && days <= 9) return "Weekly";
  if (days >= 25 && days <= 35) return "Monthly";
  if (days >= 355 && days <= 375) return "Yearly";
  return `${Math.round(days)}d`;
}

function monthlyEquivalent(amount: number, days: number): number {
  if (days <= 0) return amount;
  return (amount * 30) / days;
}

export function RecurringSubscriptionsWidget() {
  const { recurring } = useDashboardData();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { charges, monthlyTotal } = useMemo(() => {
    const list = [...recurring.charges].sort((a, b) => {
      const aDate = a.next_expected ? new Date(a.next_expected).getTime() : 0;
      const bDate = b.next_expected ? new Date(b.next_expected).getTime() : 0;
      return aDate - bDate;
    });
    const total = list.reduce((s, c) => s + monthlyEquivalent(c.amount, c.cadence_days), 0);
    return { charges: list, monthlyTotal: total };
  }, [recurring]);

  const ccy = recurring.currency;

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
          Recurring
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          {charges.length} {charges.length === 1 ? "charge" : "charges"}
        </span>
      </div>

      {charges.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          No recurring charges detected
        </div>
      ) : (
        <>
          <ul className="mt-2.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {charges.map((c) => {
              const swatch = isDark
                ? (c.category_color_dark ?? "var(--edge-default)")
                : (c.category_color_light ?? "var(--edge-default)");
              return (
                <li
                  key={`${c.merchant}-${c.amount}-${c.cadence_days}`}
                  className="flex items-center gap-3 rounded-md border border-edge-default/70 bg-surface-elevated/55 px-2.5 py-1.5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: swatch }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium leading-tight text-content-primary">
                      {c.merchant}
                    </span>
                    <span className="truncate text-[10px] text-content-tertiary">
                      {cadenceLabel(c.cadence_days)} · {c.occurrences}x
                      {c.next_expected ? ` · next ${formatDate(c.next_expected, "mobile")}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-content-primary">
                    {formatCurrency(c.amount, ccy, true, 0)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-edge-default/80 pt-2 text-[11px]">
            <span className="text-content-tertiary">Monthly equivalent</span>
            <span className="font-semibold text-content-secondary tabular-nums">
              {formatCurrency(monthlyTotal, ccy, true, 0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
