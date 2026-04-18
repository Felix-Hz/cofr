import { useMemo } from "react";
import { useDashboardPeriodStats } from "~/lib/dashboard/data-context";
import { useTheme } from "~/lib/theme";
import { formatCurrency } from "~/lib/utils";

const MAX_ROWS = 6;

export function TopCategoriesBarsWidget() {
  const periodStats = useDashboardPeriodStats();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const rows = useMemo(() => {
    const entries = periodStats.category_breakdown
      .filter((cat) => cat.category_type !== "income")
      .sort((a, b) => b.total - a.total)
      .slice(0, MAX_ROWS);
    const max = entries[0]?.total ?? 0;
    return entries.map((cat) => ({
      name: cat.category,
      total: cat.total,
      count: cat.count,
      share: max > 0 ? cat.total / max : 0,
      pctOfSpend: periodStats.total_spent > 0 ? (cat.total / periodStats.total_spent) * 100 : 0,
      color: isDark ? cat.category_color_dark : cat.category_color_light,
    }));
  }, [periodStats, isDark]);

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4M3 6h8M3 18h12" />
          </svg>
          Top categories
        </div>
        {rows.length > 0 && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
            Top {rows.length}
          </span>
        )}
      </div>
      {rows.length > 0 ? (
        <ul className="mt-2 flex min-h-0 flex-1 flex-col justify-around gap-2 overflow-hidden">
          {rows.map((row) => (
            <li key={row.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate font-medium text-content-secondary">
                  {row.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-content-primary">
                  {formatCurrency(row.total, periodStats.currency, true, 0)}
                  <span className="ml-1.5 font-normal text-content-muted">
                    {row.pctOfSpend.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(row.share * 100, 2)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="h-10 w-16 rounded-sm border border-edge-default" />
          <p className="text-xs text-content-muted">No spending data this period</p>
        </div>
      )}
    </div>
  );
}
