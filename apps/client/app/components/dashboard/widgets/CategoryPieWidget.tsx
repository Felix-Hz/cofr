import { useMemo } from "react";
import { Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import CategoryPieTooltip from "~/components/CategoryPieTooltip";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { useTheme } from "~/lib/theme";

/**
 * Donut breakdown of period spend by category. Legend collapses under
 * ~360px so the widget still renders nicely in a 4-wide column.
 */
export function CategoryPieWidget() {
  const { periodStats } = useDashboardData();
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
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
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
      {pieData.length > 0 ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 items-center justify-center min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart tabIndex={-1} style={{ outline: "none" }}>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="95%"
                  paddingAngle={1}
                  strokeWidth={0.5}
                  strokeOpacity={0.65}
                  focusable={false}
                />
                <RechartsTooltip content={<CategoryPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col justify-center gap-1.5 sm:w-[180px]">
            {pieData.slice(0, 6).map((entry) => (
              <div key={entry.category} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-content-secondary">
                  {entry.category}
                </span>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-content-primary">
                  {entry.formatted}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-16 w-16 rounded-full border-[5px] border-edge-default" />
          <p className="text-xs text-content-muted">No spending data this period</p>
        </div>
      )}
    </div>
  );
}
