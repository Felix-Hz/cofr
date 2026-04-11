import type { ReactNode } from "react";
import { StatCardBase } from "./StatCardBase";
import { type PeriodStatWidgetType, usePeriodStatCell } from "./usePeriodStatCells";

const WIDGET_ICONS: Record<PeriodStatWidgetType, ReactNode> = {
  stat_income: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
    </svg>
  ),
  stat_spent: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l6 6 4-4 8 8" />
    </svg>
  ),
  stat_net: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
    </svg>
  ),
  stat_savings_rate: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  ),
};

export function PeriodStatWidget({ widgetType }: { widgetType: PeriodStatWidgetType }) {
  const cell = usePeriodStatCell(widgetType);
  const trailing =
    widgetType === "stat_net" && cell.trailing ? (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          cell.tone === "negative"
            ? "bg-negative-bg text-negative-text"
            : "bg-positive-bg text-positive-text-strong"
        }`}
      >
        {cell.trailing}
      </span>
    ) : undefined;

  return (
    <StatCardBase
      label={widgetType === "stat_savings_rate" ? "Savings rate" : cell.label}
      tone={cell.tone}
      icon={WIDGET_ICONS[widgetType]}
      value={cell.value}
      trailing={trailing}
      footnote={widgetType === "stat_net" ? undefined : cell.footnote}
    />
  );
}
