import { useLoaderData } from "react-router";
import { getExpenses, getMonthlyStats } from "~/lib/api";
import { formatCurrency, getCategoryColor } from "~/lib/utils";

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-gray-600">Your expense summary for this month</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Spent</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(monthlyStats.total_spent, "NZD")}
          </div>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Transactions</div>
          <div className="text-2xl font-bold mt-2">
            {monthlyStats.transaction_count}
          </div>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Categories</div>
          <div className="text-2xl font-bold mt-2">
            {monthlyStats.category_breakdown.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">Active this month</p>
        </div>
      </div>

      {/* Recent Expenses */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Recent Expenses</h3>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {recentExpenses.expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No expenses found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExpenses.expenses.map((expense: any) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                        style={{
                          backgroundColor: getCategoryColor(
                            expense.category,
                          ),
                        }}
                      >
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
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
