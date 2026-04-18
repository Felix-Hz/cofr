import { useMemo } from "react";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function differenceInCalendarDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function todayAsDateOnly(now: Date): Date {
  return parseDateOnly(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  );
}

export function AverageDailySpendWidget() {
  const { periodStats, startDate, endDate } = useDashboardData();

  const { daysElapsed, daysTotal, avgPerDay, projected, isCurrent } = useMemo(() => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    const now = new Date();
    const today = todayAsDateOnly(now);
    const total = Math.max(differenceInCalendarDays(start, end) + 1, 1);
    const isCurr = today >= start && today <= end;
    const elapsed = today < start ? 1 : isCurr ? differenceInCalendarDays(start, today) + 1 : total;
    const avg = periodStats.total_spent / elapsed;
    return {
      daysElapsed: elapsed,
      daysTotal: total,
      avgPerDay: avg,
      projected: isCurr ? avg * total : periodStats.total_spent,
      isCurrent: isCurr,
    };
  }, [periodStats, startDate, endDate]);

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
              d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Avg / day
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          Day {daysElapsed} / {daysTotal}
        </span>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-[1.75rem] font-semibold leading-none tracking-tight text-content-heading tabular-nums">
            {formatCurrency(avgPerDay, periodStats.currency, true, 0)}
          </span>
          <span className="text-[11px] font-medium text-content-tertiary">per day</span>
        </div>
        {isCurrent && daysElapsed < daysTotal ? (
          <div className="text-[11px] text-content-tertiary">
            On track for{" "}
            <span className="font-semibold tabular-nums text-content-secondary">
              {formatCurrency(projected, periodStats.currency, true, 0)}
            </span>{" "}
            by period end
          </div>
        ) : (
          <div className="text-[11px] text-content-tertiary">
            Range total{" "}
            <span className="font-semibold tabular-nums text-content-secondary">
              {formatCurrency(periodStats.total_spent, periodStats.currency, true, 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
