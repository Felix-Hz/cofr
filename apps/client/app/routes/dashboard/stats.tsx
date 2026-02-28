import { useLoaderData, useNavigate } from "react-router";
import { getMonthlyStats } from "~/lib/api";
import { formatCurrency, getCategoryColor } from "~/lib/utils";

const CURRENCIES = ["NZD", "EUR", "USD", "GBP", "AUD"];
const ALLOCATION_CATEGORIES = ["Income", "Savings", "Investment"];

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const month =
    Number(url.searchParams.get("month")) || new Date().getMonth() + 1;
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const currency = url.searchParams.get("currency") || undefined;

  const stats = await getMonthlyStats(month, year, currency);
  return { stats, month, year, currentCurrency: currency || "" };
}

export default function Statistics() {
  const navigate = useNavigate();
  const { stats, month, year, currentCurrency } =
    useLoaderData<typeof clientLoader>();

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Calculations
  const totalAllocated = stats.total_savings + stats.total_investment;
  const netBalance = stats.total_income - stats.total_spent - totalAllocated;
  const averagePerExpense =
    stats.expense_count > 0 ? stats.total_spent / stats.expense_count : 0;
  const savingsRate =
    stats.total_income > 0 ? (stats.total_savings / stats.total_income) * 100 : 0;
  const investmentRate =
    stats.total_income > 0 ? (stats.total_investment / stats.total_income) * 100 : 0;
  const allocationRate =
    stats.total_income > 0 ? (totalAllocated / stats.total_income) * 100 : 0;

  const buildUrl = (params: {
    month: number;
    year: number;
    currency?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("month", params.month.toString());
    searchParams.set("year", params.year.toString());
    if (params.currency) {
      searchParams.set("currency", params.currency);
    }
    return `?${searchParams.toString()}`;
  };

  const handleMonthChange = (newMonth: number) => {
    navigate(buildUrl({ month: newMonth, year, currency: currentCurrency }));
  };

  const handleYearChange = (newYear: number) => {
    navigate(buildUrl({ month, year: newYear, currency: currentCurrency }));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    navigate(buildUrl({ month, year, currency: newCurrency || undefined }));
  };

  const goToPrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }
    navigate(buildUrl({ month: newMonth, year: newYear, currency: currentCurrency }));
  };

  const goToNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    }
    navigate(buildUrl({ month: newMonth, year: newYear, currency: currentCurrency }));
  };

  // Helper to calculate percentage for table
  const getPercentageDisplay = (category: string, total: number): string => {
    if (category === "Income") {
      return "—";
    }
    if (category === "Savings" || category === "Investment") {
      if (stats.total_income > 0) {
        return `${((total / stats.total_income) * 100).toFixed(1)}% of income`;
      }
      return "—";
    }
    // Regular expense categories = % of total spent
    if (stats.total_spent > 0) {
      return `${((total / stats.total_spent) * 100).toFixed(1)}%`;
    }
    return "0.0%";
  };

  const getCategoryType = (category: string): "income" | "allocation" | "expense" => {
    if (category === "Income") return "income";
    if (category === "Savings" || category === "Investment") return "allocation";
    return "expense";
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Statistics</h2>
          <p className="text-gray-600">
            {months[month - 1]} {year} financial summary
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={currentCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
          >
            <option value="">All Currencies</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mixed currency warning */}
      {!currentCurrency && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          Showing all currencies without conversion. Select a specific currency for accurate totals.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Income */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-700">Income</div>
          <div className="text-2xl font-bold mt-2 text-green-700">
            {formatCurrency(stats.total_income, stats.currency)}
          </div>
          <p className="text-xs text-green-600 mt-1">Money received</p>
        </div>

        {/* Spent */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Spent</div>
          <div className="text-2xl font-bold mt-2 text-gray-900">
            {formatCurrency(stats.total_spent, stats.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.expense_count} transactions • Avg {formatCurrency(averagePerExpense, stats.currency)}
          </p>
        </div>

        {/* Allocated (Savings + Investment) */}
        <div className="bg-emerald-soft p-6 rounded-lg border border-emerald/20">
          <div className="text-sm font-medium text-emerald-dark">Allocated</div>
          <div className="text-2xl font-bold mt-2 text-emerald-dark">
            {formatCurrency(totalAllocated, stats.currency)}
          </div>
          <p className="text-xs text-emerald mt-1">
            {allocationRate.toFixed(1)}% of income ({savingsRate.toFixed(0)}% saved, {investmentRate.toFixed(0)}% invested)
          </p>
        </div>

        {/* Remaining */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-gray-600">Remaining</div>
          <div className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(netBalance, stats.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Unallocated funds</p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Category Breakdown</h3>
        </div>
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
                Count
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.category_breakdown.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              stats.category_breakdown.map((cat: any) => {
                const avg = cat.count > 0 ? cat.total / cat.count : 0;
                const categoryType = getCategoryType(cat.category);

                return (
                  <tr
                    key={cat.category}
                    className={
                      categoryType === "income"
                        ? "bg-green-50"
                        : categoryType === "allocation"
                          ? "bg-emerald-soft"
                          : ""
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(cat.category) }}
                        />
                        {cat.category}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        categoryType === "income"
                          ? "text-green-700"
                          : categoryType === "allocation"
                            ? "text-emerald-dark"
                            : "text-gray-900"
                      }`}
                    >
                      {formatCurrency(cat.total, stats.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {cat.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(avg, stats.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {getPercentageDisplay(cat.category, cat.total)}
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
