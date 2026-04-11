import { useDashboardData } from "~/lib/dashboard/data-context";
import type { Expense } from "~/lib/schemas";
import { useTheme } from "~/lib/theme";
import { formatCurrency, formatDate, isPositiveType, truncateText } from "~/lib/utils";

/**
 * Recent-transactions table widget. Pagination is intentionally omitted
 * from the widget itself — dashboard controls still drive the period and
 * slice via URL params, keeping widgets stateless.
 */
export function TransactionsWidget() {
  const { expenses, onExpenseEdit } = useDashboardData();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const displayExpenses = expenses.filter((e) => !(e.is_transfer && e.transfer_direction === "to"));

  const getTransferLabel = (expense: Expense): string => {
    const linkedTo = expenses.find(
      (e) => e.id === expense.linked_transaction_id && e.transfer_direction === "to",
    );
    return `${expense.account_name} → ${linkedTo?.account_name ?? "?"}`;
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
          {displayExpenses.length} showing
        </span>
      </div>
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
            {displayExpenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-xs text-content-tertiary">
                  No transactions in this range
                </td>
              </tr>
            ) : (
              displayExpenses.map((expense) => {
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
