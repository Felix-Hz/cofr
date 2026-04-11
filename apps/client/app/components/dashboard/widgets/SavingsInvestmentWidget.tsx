import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

export function SavingsInvestmentWidget() {
  const { lifetimeStats } = useDashboardData();
  const { savings_balance, investment_balance, checking_balance, currency } = lifetimeStats;
  const cells = [
    { label: "Savings", value: savings_balance, accent: "text-positive-text-strong" },
    { label: "Investment", value: investment_balance, accent: "text-accent-soft-text" },
    { label: "Checking", value: checking_balance, accent: "text-content-primary" },
  ];
  return (
    <div className="flex h-full flex-col gap-3 p-5">
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
      <div className="flex flex-1 flex-col justify-center gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
              {cell.label}
            </span>
            <span className={`text-lg font-bold tabular-nums ${cell.accent}`}>
              {formatCurrency(cell.value, currency, true, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
