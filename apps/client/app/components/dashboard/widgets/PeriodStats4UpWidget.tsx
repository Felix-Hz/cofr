import { useDashboardData } from "~/lib/dashboard/data-context";
import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { formatCurrency } from "~/lib/utils";

export function PeriodStats4UpWidget({ widget }: WidgetRenderProps) {
  const { periodStats } = useDashboardData();
  const net = periodStats.total_income - periodStats.total_spent;
  const netPct =
    periodStats.total_income > 0 ? Math.round((net / periodStats.total_income) * 100) : 0;
  const savingsRate =
    periodStats.total_income > 0
      ? (periodStats.savings_net_change / periodStats.total_income) * 100
      : 0;
  const isCompact = widget.row_span <= 1;
  const cells: Array<{
    label: string;
    value: string;
    trailing?: string;
    tone: "positive" | "negative" | "accent" | "neutral";
  }> = [
    {
      label: "Income",
      value: formatCurrency(periodStats.total_income, periodStats.currency, true, 0),
      tone: "positive",
    },
    {
      label: "Spent",
      value: formatCurrency(periodStats.total_spent, periodStats.currency, true, 0),
      tone: "negative",
    },
    {
      label: "Net",
      value: formatCurrency(net, periodStats.currency, true, 0),
      trailing: `${netPct >= 0 ? "+" : ""}${netPct}%`,
      tone: net >= 0 ? "accent" : "negative",
    },
    {
      label: "Savings",
      value: `${savingsRate.toFixed(1)}%`,
      trailing: formatCurrency(periodStats.savings_net_change, periodStats.currency, true, 0),
      tone: savingsRate >= 0 ? "positive" : "negative",
    },
  ];
  const toneLabel = {
    positive: "text-positive-text-strong/70",
    negative: "text-negative-text/70",
    accent: "text-accent-soft-text/70",
    neutral: "text-content-tertiary",
  };
  return (
    <div className="grid h-full grid-cols-2 divide-x divide-y divide-edge-default sm:grid-cols-4 sm:divide-y-0">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`flex flex-col justify-center ${isCompact ? "gap-1 px-4 py-3" : "gap-1 px-5 py-4"}`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${toneLabel[cell.tone]}`}
          >
            {cell.label}
          </span>
          <div
            className={`flex ${isCompact ? "flex-col items-start gap-0.5" : "items-baseline gap-2"}`}
          >
            <span
              className={`font-bold tabular-nums text-content-primary ${isCompact ? "text-lg leading-tight sm:text-xl" : "text-xl sm:text-2xl"}`}
            >
              {cell.value}
            </span>
            {cell.trailing && (
              <span className="text-[11px] font-medium text-content-tertiary tabular-nums">
                {cell.trailing}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
