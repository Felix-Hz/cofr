import { useMemo } from "react";
import { Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import CategoryPieTooltip from "~/components/CategoryPieTooltip";
import { useDashboardData } from "~/lib/dashboard/data-context";
import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { useTheme } from "~/lib/theme";

export function CategoryPieWidget({ widget }: WidgetRenderProps) {
  const { periodStats } = useDashboardData();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isCompact = widget.row_span <= 3;

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
    <div className={`flex h-full flex-col overflow-hidden ${isCompact ? "p-3.5" : "p-4"}`}>
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
        <div
          className={`flex min-h-0 flex-1 ${isCompact ? "mt-2.5 flex-col gap-3" : "mt-3 flex-col gap-4 sm:flex-row"}`}
        >
          <div
            className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md ${isCompact ? "bg-surface-elevated/40 px-2 py-2" : ""}`}
          >
            <ResponsiveContainer width="100%" height={isCompact ? 180 : 320}>
              <PieChart tabIndex={-1} style={{ outline: "none" }}>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={isCompact ? "42%" : "45%"}
                  outerRadius={isCompact ? "88%" : "110%"}
                  paddingAngle={0}
                  strokeWidth={0.5}
                  strokeOpacity={0.65}
                  focusable={false}
                />
                <RechartsTooltip content={<CategoryPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className={`flex min-w-0 shrink-0 flex-col overflow-auto ${isCompact ? "gap-1.5" : "justify-center gap-2 sm:w-[176px]"}`}
          >
            {pieData.slice(0, isCompact ? 4 : pieData.length).map((entry) => (
              <div key={entry.category} className="flex min-w-0 items-center gap-2.5">
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
            {isCompact && pieData.length > 4 && (
              <div className="pt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-content-tertiary">
                +{pieData.length - 4} more categories
              </div>
            )}
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
