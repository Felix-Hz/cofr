import type { ReactElement } from "react";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const ACCOUNT_ICONS: Record<string, ReactElement> = {
  checking: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 15.75h19.5M3.75 5.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
    />
  ),
  savings: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  ),
  investment: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    />
  ),
};

export function AccountBalancesWidget() {
  const { accountBalances, periodStats } = useDashboardData();
  const total = accountBalances.reduce((sum, ab) => sum + ab.balance, 0);
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
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
              d="M2.25 8.25h19.5M2.25 15.75h19.5M3.75 5.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
            />
          </svg>
          Accounts
        </div>
        <span className="text-sm font-semibold tabular-nums text-content-primary">
          {formatCurrency(total, periodStats.currency)}
        </span>
      </div>
      {accountBalances.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center text-xs text-content-muted">
          No accounts yet
        </div>
      ) : (
        <div className="mt-3 grid flex-1 auto-rows-min grid-cols-1 gap-2 sm:grid-cols-2">
          {accountBalances.map((ab) => (
            <div
              key={ab.account_id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-edge-default bg-surface-elevated px-3 py-2"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 text-content-tertiary"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                {ACCOUNT_ICONS[ab.account_type] ?? ACCOUNT_ICONS.checking}
              </svg>
              <span className="truncate text-xs font-medium text-content-primary">
                {ab.account_name}
              </span>
              <span
                className={`ml-auto shrink-0 text-xs font-semibold tabular-nums ${
                  ab.balance > 0
                    ? "text-positive-text-strong"
                    : ab.balance < 0
                      ? "text-negative-text"
                      : "text-content-tertiary"
                }`}
              >
                {formatCurrency(ab.balance, periodStats.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
