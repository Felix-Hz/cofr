import { useDashboardActions, useDashboardData } from "~/lib/dashboard/data-context";
import type { Expense } from "~/lib/schemas";
import { useTheme } from "~/lib/theme";
import { formatCurrency, formatDate, isPositiveType, truncateText } from "~/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TransactionsWidget() {
  const { expenses, expensesLimit, expensesOffset, expensesTotal } = useDashboardData();
  const { onCreateExpense, onExpenseEdit, onTransactionsPageChange, onTransactionsPageSizeChange } =
    useDashboardActions();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const displayExpenses = expenses;
  const page = Math.floor(expensesOffset / Math.max(1, expensesLimit));
  const totalPages = Math.max(1, Math.ceil(expensesTotal / Math.max(1, expensesLimit)));
  const pageStart = expensesTotal === 0 ? 0 : expensesOffset + 1;
  const pageEnd = Math.min(expensesOffset + expenses.length, expensesTotal);
  const canGoPrevious = expensesOffset > 0;
  const canGoNext = expensesOffset + expensesLimit < expensesTotal;

  const getTransferLabel = (expense: Expense): string => {
    return `${expense.account_name} → ${expense.linked_account_name ?? "?"}`;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-edge-default px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Transactions
        </div>
        <span className="text-[11px] text-content-tertiary tabular-nums">
          {pageStart}-{pageEnd} of {expensesTotal}
        </span>
      </div>
      {displayExpenses.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-edge-default bg-surface-elevated text-content-secondary">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <h4 className="mt-4 text-sm font-semibold tracking-tight text-content-heading">
              No transactions yet
            </h4>
            <p className="mt-2 text-sm leading-6 text-content-secondary">
              Start with one expense or funding entry. This table becomes your working ledger for
              edits, spot checks, and recent activity.
            </p>
            <button
              type="button"
              onClick={onCreateExpense}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-emerald px-4 text-sm font-medium text-white transition-[background-color] duration-200 hover:bg-emerald-hover"
            >
              Add first transaction
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full table-fixed divide-y divide-edge-default">
            <thead className="sticky top-0 bg-surface-primary">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Date
                </th>
                <th className="hidden px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-content-tertiary sm:table-cell">
                  Account
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Category
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-default">
              {displayExpenses.map((expense) => {
                const isPositive = isPositiveType(expense.category_type);
                const isTransfer = expense.is_transfer;
                const catColor = isDark
                  ? expense.category_color_dark
                  : expense.category_color_light;
                return (
                  <tr
                    key={expense.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpenseEdit(expense);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isTransfer
                        ? "bg-accent-soft-bg/30 hover:bg-accent-soft-bg/50"
                        : isPositive
                          ? "bg-positive-bg/50 hover:bg-positive-bg"
                          : "hover:bg-surface-hover"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-[11px] tabular-nums text-content-tertiary">
                      {formatDate(expense.created_at, "mobile")}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-[11px] text-content-tertiary sm:table-cell">
                      {truncateText(expense.account_name, 14)}
                    </td>
                    <td className="px-4 py-2.5">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1.5 truncate text-[11px] font-medium text-accent-soft-text">
                          <svg
                            className="h-3 w-3 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                          <span className="truncate">{getTransferLabel(expense)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 truncate text-[11px] font-medium text-content-primary">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="truncate">{expense.category_name}</span>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[11px] font-medium tabular-nums text-content-primary">
                      <span className="inline-flex items-center justify-end gap-1">
                        {expense.is_opening_balance && (
                          <span className="rounded bg-accent-soft-bg px-1 py-0.5 text-[9px] font-semibold text-accent-soft-text">
                            OB
                          </span>
                        )}
                        {isTransfer && (
                          <span className="rounded bg-accent-soft-bg px-1 py-0.5 text-[9px] font-semibold text-accent-soft-text">
                            TR
                          </span>
                        )}
                        {isPositive && !expense.is_opening_balance && !isTransfer && (
                          <span className="rounded bg-positive-bg px-1 py-0.5 text-[9px] font-semibold text-positive-text-strong">
                            IN
                          </span>
                        )}
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(expensesTotal > 0 || expensesOffset > 0) && (
        <div className="flex items-center justify-between gap-3 border-t border-edge-default px-4 py-3">
          <button
            type="button"
            onClick={() => onTransactionsPageChange(expensesOffset - expensesLimit)}
            disabled={!canGoPrevious}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-content-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-content-tertiary sm:inline">
              Page {page + 1} of {totalPages}
            </span>
            <select
              value={expensesLimit}
              onChange={(event) => onTransactionsPageSizeChange(Number(event.target.value))}
              className="h-7 rounded-md border border-edge-strong bg-surface-primary px-2 text-[11px] text-content-secondary focus:outline-none focus:ring-2 focus:ring-emerald/40"
              aria-label="Transactions per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => onTransactionsPageChange(expensesOffset + expensesLimit)}
            disabled={!canGoNext}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-content-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
