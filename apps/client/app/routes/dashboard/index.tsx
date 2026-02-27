import { useLoaderData } from "react-router";
import { getExpenses, getMonthlyStats } from "~/lib/api";
import { Expense } from "~/lib/schemas";
import { formatCurrency, formatDate, getCategoryColor } from "~/lib/utils";

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

  console.log(recentExpenses, monthlyStats);

  // Calculations
  const totalAllocated = monthlyStats.total_savings +
    monthlyStats.total_investment;
  const netBalance = monthlyStats.total_income - monthlyStats.total_spent -
    totalAllocated;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-gray-600">Your financial summary for this month</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Income */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-700">Income</div>
          <div className="text-2xl font-bold mt-2 text-green-700">
            {formatCurrency(monthlyStats.total_income, monthlyStats.currency)}
          </div>
          <p className="text-xs text-green-600 mt-1">Money received</p>
        </div>

        {/* Spent */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Spent</div>
          <div className="text-2xl font-bold mt-2 text-gray-900">
            {formatCurrency(monthlyStats.total_spent, monthlyStats.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {monthlyStats.expense_count}{" "}
            expense{monthlyStats.expense_count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Allocated */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-700">Allocated</div>
          <div className="text-2xl font-bold mt-2 text-blue-700">
            {formatCurrency(totalAllocated, monthlyStats.currency)}
          </div>
          <p className="text-xs text-blue-600 mt-1">Savings & investments</p>
        </div>

        {/* Remaining */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Remaining</div>
          <div
            className={`text-2xl font-bold mt-2 ${
              netBalance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(netBalance, monthlyStats.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Unallocated funds</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Latest Transactions</h3>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {recentExpenses.expenses.length === 0
            ? (
              <div className="text-center py-12 text-gray-500">
                No transactions found
              </div>
            )
            : (
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentExpenses.expenses.map((expense: Expense) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatDate(expense.created_at)}
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
