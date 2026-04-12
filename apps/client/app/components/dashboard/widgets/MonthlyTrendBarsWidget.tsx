import { useMemo } from "react";
import Tooltip from "~/components/Tooltip";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonth(key: string): string {
  const [, m] = key.split("-");
  const idx = Number.parseInt(m, 10) - 1;
  return MONTH_LABELS[idx] ?? key;
}

export function MonthlyTrendBarsWidget() {
  const { monthlyTrend } = useDashboardData();

  const { points, max, totalIncome, totalSpent, axisLabels } = useMemo(() => {
    const pts = monthlyTrend.points;
    const peak = Math.max(1, ...pts.flatMap((p) => [p.income, p.spent]));
    return {
      points: pts,
      max: peak,
      totalIncome: pts.reduce((s, p) => s + p.income, 0),
      totalSpent: pts.reduce((s, p) => s + p.spent, 0),
      axisLabels: [
        { id: "top", value: peak },
        { id: "mid", value: peak / 2 },
        { id: "bottom", value: 0 },
      ],
    };
  }, [monthlyTrend]);

  const ccy = monthlyTrend.currency;

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
              d="M3 3v18h18M7 17V9m5 8V5m5 12v-7"
            />
          </svg>
          Monthly trend
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          {points.length}m
        </span>
      </div>

      {points.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          No trend data yet
        </div>
      ) : (
        <>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-edge-default bg-surface-elevated/65">
              <div className="flex h-full">
                <div className="flex w-14 shrink-0 flex-col justify-between px-2 py-2 text-[9px] font-medium tabular-nums text-content-muted">
                  {axisLabels.map((label) => (
                    <div
                      key={label.id}
                      className={`flex items-center gap-1.5 ${label.id === "mid" ? "translate-y-1/2" : ""}`}
                    >
                      <span>{formatCurrency(label.value, ccy, true, 0)}</span>
                      <span className="h-px flex-1 bg-edge-default/28" />
                    </div>
                  ))}
                </div>
                <div className="relative flex min-w-0 flex-1 items-end gap-1.5 px-2 py-2">
                  <div className="pointer-events-none absolute inset-x-2 top-2 border-t border-edge-default/40" />
                  <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dashed border-edge-default/35" />
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 border-t border-edge-default/40" />
                  {points.map((p) => {
                    const incomeH = (p.income / max) * 100;
                    const spentH = (p.spent / max) * 100;
                    return (
                      <Tooltip
                        key={p.month}
                        content={`${formatMonth(p.month)}: +${formatCurrency(p.income, ccy, true, 0)} / -${formatCurrency(p.spent, ccy, true, 0)}`}
                        className="flex h-full min-w-0 flex-1"
                      >
                        <div className="group relative z-[1] flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
                          <div
                            className="w-1/2 max-w-[10px] rounded-t-[2px] bg-emerald/85 transition-opacity group-hover:bg-emerald"
                            style={{ height: `${Math.max(incomeH, p.income > 0 ? 2 : 0)}%` }}
                          />
                          <div
                            className="w-1/2 max-w-[10px] rounded-t-[2px] bg-negative-btn/85 transition-opacity group-hover:bg-negative-btn"
                            style={{ height: `${Math.max(spentH, p.spent > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {points.map((p) => (
                <span
                  key={p.month}
                  className="min-w-0 flex-1 truncate text-center text-[9px] font-medium uppercase tracking-wide text-content-muted"
                >
                  {formatMonth(p.month)}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge-default/80 pt-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-content-tertiary">
              <span className="h-2 w-2 rounded-sm bg-emerald/85" />
              <span className="font-semibold tabular-nums text-content-secondary">
                {formatCurrency(totalIncome, ccy, true, 0)}
              </span>
              <span className="text-content-muted">income</span>
            </div>
            <div className="flex items-center gap-1.5 text-content-tertiary">
              <span className="h-2 w-2 rounded-sm bg-negative-btn/85" />
              <span className="font-semibold tabular-nums text-content-secondary">
                {formatCurrency(totalSpent, ccy, true, 0)}
              </span>
              <span className="text-content-muted">spent</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
