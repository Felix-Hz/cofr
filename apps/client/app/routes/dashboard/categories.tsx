import { useLoaderData } from "react-router";
import { getMonthlyStats } from "~/lib/api";
import { formatCurrency, getCategoryColor } from "~/lib/utils";

export async function clientLoader() {
  const currentDate = new Date();
  const monthlyStats = await getMonthlyStats(
    currentDate.getMonth() + 1,
    currentDate.getFullYear(),
  );

  return { monthlyStats };
}

export default function Categories() {
  const { monthlyStats } = useLoaderData<typeof clientLoader>();
  const areTransactionsAvailable = monthlyStats.category_breakdown.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
        <p className="text-gray-600">View expenses organized by category</p>
      </div>

      {/* Category Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {areTransactionsAvailable ? (
          monthlyStats.category_breakdown.map(
            (cat: { category: string; total: number; count: number }) => (
              <div
                key={cat.category}
                className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(cat.category),
                    }}
                  />
                  <div className="text-lg font-semibold">{cat.category}</div>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {formatCurrency(cat.total, "EUR")}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {cat.count} transactions
                </p>
              </div>
            ),
          )
        ) : (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="text-lg font-semibold">No categories found</div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(0, "NZD")}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              No transactions this month
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
