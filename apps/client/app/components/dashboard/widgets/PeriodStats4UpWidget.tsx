import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { usePeriodStatCells } from "./usePeriodStatCells";

export function PeriodStats4UpWidget({ widget }: WidgetRenderProps) {
  const cellsByType = usePeriodStatCells();
  const isCompact = widget.row_span <= 1;
  const cells = [
    cellsByType.stat_income,
    cellsByType.stat_spent,
    cellsByType.stat_net,
    cellsByType.stat_savings_rate,
  ];
  const toneLabel = {
    positive: "text-positive-text-strong/70",
    negative: "text-negative-text/70",
    accent: "text-accent-soft-text/70",
    neutral: "text-content-tertiary",
  };
  const pillTone = {
    positive: "bg-positive-bg text-positive-text-strong",
    negative: "bg-negative-bg text-negative-text",
    accent: "bg-accent-soft-bg text-accent-soft-text",
    neutral: "bg-surface-elevated text-content-tertiary",
  };
  return (
    <div className="grid h-full grid-cols-2 divide-x divide-y divide-edge-default sm:grid-cols-4 sm:divide-y-0">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`grid min-h-0 content-start grid-rows-[auto,auto] ${isCompact ? "gap-1 px-4 py-3" : "gap-1.5 px-5 py-4"}`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${toneLabel[cell.tone]}`}
          >
            {cell.widgetType === "stat_savings_rate" ? "Savings" : cell.label}
          </span>
          <div
            className={`flex min-h-0 items-center ${isCompact ? "flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2" : "flex-wrap gap-2"}`}
          >
            <span
              className={`font-bold tabular-nums text-content-primary ${isCompact ? "text-xl leading-tight sm:text-[1.75rem]" : "text-[1.75rem] sm:text-[2rem]"}`}
            >
              {cell.value}
            </span>
            {cell.trailing &&
              (cell.widgetType === "stat_net" || cell.widgetType === "stat_savings_rate") && (
                <span
                  className={`hidden items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums sm:inline-flex ${pillTone[cell.tone]}`}
                >
                  {cell.trailing}
                </span>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
