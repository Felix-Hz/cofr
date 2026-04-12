import { useMemo } from "react";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdayHeatmapWidget() {
  const { weekdayHeatmap } = useDashboardData();

  const ccy = weekdayHeatmap.currency;
  const weeks = weekdayHeatmap.weeks;

  const { rows, weekdayTotals, peakWeekday } = useMemo(() => {
    const totals = new Array(7).fill(0);
    let peak = 0;
    const cellMap = new Map<string, number>();
    for (const cell of weekdayHeatmap.cells) {
      cellMap.set(`${cell.week}-${cell.weekday}`, cell.total);
      totals[cell.weekday] += cell.total;
      if (cell.total > peak) peak = cell.total;
    }
    const max = Math.max(peak, 1);

    const built = WEEKDAY_FULL.map((dayName, weekday) => ({
      dayName,
      cells: Array.from({ length: weeks }, (_, week) => {
        const value = cellMap.get(`${week}-${weekday}`) ?? 0;
        const opacity = value === 0 ? 0.08 : 0.18 + (value / max) * 0.82;
        return {
          id: `${dayName}-w${week}`,
          weekNumber: week + 1,
          value,
          opacity,
        };
      }),
    }));

    let peakIdx = 0;
    for (let i = 1; i < 7; i++) {
      if (totals[i] > totals[peakIdx]) peakIdx = i;
    }
    return {
      rows: built,
      weekdayTotals: totals,
      peakWeekday: totals[peakIdx] > 0 ? peakIdx : -1,
    };
  }, [weekdayHeatmap, weeks]);

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
              d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
            />
          </svg>
          Weekday heatmap
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          {weeks}w
        </span>
      </div>

      <div className="mt-3 flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {rows.map((row, index) => (
            <div
              key={row.dayName}
              className="flex min-h-0 flex-1 items-stretch gap-2"
              data-weekday-row={row.dayName}
            >
              <span
                className="flex w-4 shrink-0 items-center justify-start text-[9px] font-medium uppercase tracking-wide text-content-muted"
                data-weekday-label={row.dayName}
              >
                {WEEKDAY_LABELS[index]}
              </span>
              <div className="flex min-w-0 flex-1 gap-[3px]">
                {row.cells.map((cell) => (
                  <div
                    key={cell.id}
                    className="flex-1 rounded-[3px] bg-emerald"
                    style={{ opacity: cell.opacity }}
                    title={`${row.dayName} · week ${cell.weekNumber}: ${formatCurrency(cell.value, ccy, true, 0)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge-default/80 pt-2.5 text-[11px]">
        <span className="text-content-tertiary">
          Heaviest day{" "}
          <span className="font-semibold text-content-secondary">
            {peakWeekday >= 0 ? WEEKDAY_FULL[peakWeekday] : "—"}
          </span>
        </span>
        <span className="font-semibold text-content-secondary tabular-nums">
          {formatCurrency(peakWeekday >= 0 ? weekdayTotals[peakWeekday] : 0, ccy, true, 0)}
        </span>
      </div>
    </div>
  );
}
