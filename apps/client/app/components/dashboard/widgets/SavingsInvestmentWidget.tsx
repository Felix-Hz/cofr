import { useDashboardLifetimeStats } from "~/lib/dashboard/data-context";
import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { formatCurrency } from "~/lib/utils";

export function SavingsInvestmentWidget({ widget }: WidgetRenderProps) {
  const lifetimeStats = useDashboardLifetimeStats();
  const { savings_balance, investment_balance, checking_balance, currency } = lifetimeStats;
  const isCompact = widget.row_span <= 1;
  const cells = [
    { label: "Savings", value: savings_balance, accent: "text-positive-text-strong" },
    { label: "Investment", value: investment_balance, accent: "text-accent-soft-text" },
    { label: "Checking", value: checking_balance, accent: "text-content-primary" },
  ];

  return (
    <div className={`flex h-full flex-col ${isCompact ? "gap-2 p-4" : "gap-3 p-5"}`}>
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
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
        Lifetime balances
      </div>
      <div
        className={
          isCompact ? "grid flex-1 grid-cols-2 gap-2" : "flex flex-1 flex-col justify-center gap-3"
        }
      >
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`flex ${
              isCompact
                ? `min-w-0 flex-col gap-1 rounded-md border border-edge-default bg-surface-elevated px-3 py-2.5 ${
                    cell.label === "Checking" ? "col-span-2" : ""
                  }`
                : "items-baseline justify-between"
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
              {cell.label}
            </span>
            <span
              className={`truncate ${isCompact ? "text-base" : "text-lg"} font-bold tabular-nums ${cell.accent}`}
            >
              {formatCurrency(cell.value, currency, true, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
