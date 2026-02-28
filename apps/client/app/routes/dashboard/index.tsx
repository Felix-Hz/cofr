import { useLoaderData } from "react-router";
import { getExpenses, getMonthlyStats } from "~/lib/api";
import { Expense } from "~/lib/schemas";
import { formatCurrency, formatDate, getCategoryColor } from "~/lib/utils";
import { useTheme } from "~/lib/theme";

export async function clientLoader() {
  const currentDate = new Date();
  const [recentExpenses, monthlyStats] = await Promise.all([
    getExpenses(10, 0), // Last 10 expenses
    getMonthlyStats(currentDate.getMonth() + 1, currentDate.getFullYear()),
  ]);

  return { recentExpenses, monthlyStats };
}

export default function DashboardOverview() {
  const { recentExpenses, monthlyStats } = useLoaderData<typeof clientLoader>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Calculations
  const totalAllocated = monthlyStats.total_savings +
    monthlyStats.total_investment;
  const netBalance = monthlyStats.total_income - monthlyStats.total_spent -
    totalAllocated;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-content-secondary">Your financial summary for this month</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Income */}
        <div className="bg-positive-bg p-6 rounded-lg border border-positive-border">
          <div className="text-sm font-medium text-positive-text-strong">Income</div>
          <div className="text-2xl font-bold mt-2 text-positive-text-strong">
            {formatCurrency(monthlyStats.total_income, monthlyStats.currency)}
          </div>
          <p className="text-xs text-positive-text mt-1">Money received</p>
        </div>

        {/* Spent */}
        <div className="bg-surface-primary p-6 rounded-lg border border-edge-default shadow-sm">
          <div className="text-sm font-medium text-content-secondary">Spent</div>
          <div className="text-2xl font-bold mt-2 text-content-primary">
            {formatCurrency(monthlyStats.total_spent, monthlyStats.currency)}
          </div>
          <p className="text-xs text-content-tertiary mt-1">
            {monthlyStats.expense_count}{" "}
            expense{monthlyStats.expense_count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Allocated */}
        <div className="bg-accent-soft-bg p-6 rounded-lg border border-accent/20">
          <div className="text-sm font-medium text-accent-soft-text">Allocated</div>
          <div className="text-2xl font-bold mt-2 text-accent-soft-text">
            {formatCurrency(totalAllocated, monthlyStats.currency)}
          </div>
          <p className="text-xs text-accent mt-1">Savings & investments</p>
        </div>

        {/* Remaining */}
        <div className="bg-surface-primary p-6 rounded-lg border border-edge-default shadow-sm">
          <div className="text-sm font-medium text-content-secondary">Remaining</div>
          <div
            className={`text-2xl font-bold mt-2 ${
              netBalance >= 0 ? "text-positive-text-strong" : "text-negative-text"
            }`}
          >
            {formatCurrency(netBalance, monthlyStats.currency)}
          </div>
          <p className="text-xs text-content-tertiary mt-1">Unallocated funds</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Latest Transactions</h3>
        <div className="bg-surface-primary rounded-lg border border-edge-default shadow-sm overflow-hidden">
          {recentExpenses.expenses.length === 0
            ? (
              <div className="text-center py-12 text-content-tertiary">
                No transactions found
              </div>
            )
            : (
              <table className="min-w-full divide-y divide-edge-default">
                <thead className="bg-surface-elevated">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-primary divide-y divide-edge-default">
                  {recentExpenses.expenses.map((expense: Expense) => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-content-primary">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                          style={{
                            backgroundColor: getCategoryColor(
                              expense.category,
                              isDark,
                            ),
                          }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-content-tertiary text-right">
                        {formatDate(expense.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-content-primary text-right">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}
