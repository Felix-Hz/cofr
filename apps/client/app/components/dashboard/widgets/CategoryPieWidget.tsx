import { useMemo } from "react";
import { Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import CategoryPieTooltip from "~/components/CategoryPieTooltip";
import { useDashboardPeriodStats } from "~/lib/dashboard/data-context";
import { useTheme } from "~/lib/theme";

export function CategoryPieWidget() {
  const periodStats = useDashboardPeriodStats();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const pieData = useMemo(() => {
    return periodStats.category_breakdown
      .filter((cat) => cat.category_type !== "income")
      .map((cat) => ({
        category: cat.category,
        total: cat.total,
        count: cat.count,
        percentage:
          periodStats.total_spent > 0
            ? `${((cat.total / periodStats.total_spent) * 100).toFixed(1)}%`
            : "0.0%",
        fill: isDark ? cat.category_color_dark : cat.category_color_light,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: periodStats.currency,
          maximumFractionDigits: 0,
        }).format(cat.total),
      }))
      .sort((a, b) => b.total - a.total);
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
            />
          </svg>
          Category breakdown
        </div>
        {pieData.length > 0 && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
            {pieData.length} {pieData.length === 1 ? "category" : "categories"}
          </span>
        )}
      </div>
      {pieData.length > 0 ? (
        <div className="mt-1.5 flex min-h-0 flex-1 items-stretch gap-2 sm:gap-3">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart tabIndex={-1} style={{ outline: "none" }}>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="96%"
                  paddingAngle={1}
                  stroke="var(--surface-primary)"
                  strokeWidth={1.5}
                  focusable={false}
                />
                <RechartsTooltip
                  content={<CategoryPieTooltip />}
                  cursor={{ fill: "transparent" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex shrink-0 min-w-[96px] max-w-[140px] flex-col justify-center gap-1 overflow-hidden sm:min-w-[124px] sm:max-w-[160px] sm:gap-1.5 sm:overflow-auto">
            {pieData.map((entry) => (
              <li
                key={entry.category}
                className="flex min-w-0 items-center gap-2"
                title={`${entry.category} - ${entry.formatted} (${entry.percentage})`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-content-secondary">
                  {entry.category}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-14 w-14 rounded-full border-[5px] border-edge-default" />
          <p className="text-xs text-content-muted">No spending data this period</p>
        </div>
      )}
    </div>
  );
}
