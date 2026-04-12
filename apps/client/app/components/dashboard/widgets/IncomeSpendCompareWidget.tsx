import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

export function IncomeSpendCompareWidget() {
  const { periodStats } = useDashboardData();
  const income = periodStats.total_income;
  const spent = periodStats.total_spent;
  const net = income - spent;
  const max = Math.max(income, spent, 1);
  const incomeShare = (income / max) * 100;
  const spentShare = (spent / max) * 100;
  const netPositive = net >= 0;

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
              d="M4 7h10m0 0l-3-3m3 3l-3 3M20 17H10m0 0l3 3m-3-3l3-3"
            />
          </svg>
          Income vs spend
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            netPositive
              ? "bg-positive-bg text-positive-text-strong"
              : "bg-negative-bg text-negative-text"
          }`}
        >
          {netPositive ? "+" : ""}
          {formatCurrency(net, periodStats.currency, true, 0)}
        </span>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center gap-3">
        <Row
          label="In"
          amount={formatCurrency(income, periodStats.currency, true, 0)}
          share={incomeShare}
          barClass="bg-positive-text-strong"
          labelClass="text-positive-text-strong"
        />
        <Row
          label="Out"
          amount={formatCurrency(spent, periodStats.currency, true, 0)}
          share={spentShare}
          barClass="bg-negative-text"
          labelClass="text-negative-text"
        />
      </div>
    </div>
  );
}

function Row({
  label,
  amount,
  share,
  barClass,
  labelClass,
}: {
  label: string;
  amount: string;
  share: number;
  barClass: string;
  labelClass: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={`font-semibold uppercase tracking-[0.16em] ${labelClass}`}>{label}</span>
        <span className="font-semibold tabular-nums text-content-primary">{amount}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${barClass}`}
          style={{ width: `${Math.max(share, 2)}%` }}
        />
      </div>
    </div>
  );
}
