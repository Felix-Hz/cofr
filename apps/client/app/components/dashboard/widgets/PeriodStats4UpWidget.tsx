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
  return (
    <div className="grid h-full grid-cols-2 divide-x divide-y divide-edge-default sm:grid-cols-4 sm:divide-y-0">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`flex flex-col justify-center sm:justify-between ${isCompact ? "gap-1 px-4 py-3" : "gap-1 px-5 py-4"}`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${toneLabel[cell.tone]}`}
          >
            {cell.widgetType === "stat_savings_rate" ? "Savings" : cell.label}
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
