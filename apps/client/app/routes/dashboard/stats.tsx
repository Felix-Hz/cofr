import { useLoaderData } from "react-router";
import { getMonthlyStats } from "~/lib/api";
import { formatCurrency, getCategoryColor } from "~/lib/utils";

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const month =
    Number(url.searchParams.get("month")) || new Date().getMonth() + 1;
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

  const stats = await getMonthlyStats(month, year);
  return { stats, month, year };
}

export default function Statistics() {
  const { stats, month, year } = useLoaderData<typeof clientLoader>();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const averagePerTransaction =
    stats.transaction_count > 0
      ? stats.total_spent / stats.transaction_count
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Statistics</h2>
          <p className="text-gray-600">Monthly spending analysis</p>
        </div>

        <div className="text-sm text-gray-600">
          {months[month - 1]} {year}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Spent</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(stats.total_spent, "EUR")}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {months[month - 1]} {year}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">
            Total Transactions
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats.transaction_count}
          </div>
          <p className="text-xs text-gray-500 mt-1">This period</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">
            Average per Transaction
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(averagePerTransaction, "EUR")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Mean spend</p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transactions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.category_breakdown.map((cat: any) => {
              const avg = cat.count > 0 ? cat.total / cat.count : 0;
              const percentage =
                stats.total_spent > 0
                  ? (cat.total / stats.total_spent) * 100
                  : 0;

              return (
                <tr key={cat.category}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(cat.category),
                        }}
                      />
                      {cat.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(cat.total, "EUR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {cat.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(avg, "EUR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {percentage.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
