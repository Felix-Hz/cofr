import { useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getExpenses,
  getExpensesByCategory,
  getExpensesByDateRange,
  getMonthlyStats,
  createExpense,
  updateExpense,
  deleteExpense,
} from "~/lib/api";
import {
  formatCurrency,
  formatDate,
  getCategoryColor,
  truncateText,
} from "~/lib/utils";
import type { Expense, ExpenseCreate } from "~/lib/schemas";
import ExpenseFormModal from "~/components/ExpenseFormModal";
import DeleteConfirmModal from "~/components/DeleteConfirmModal";
import FilterModal from "~/components/FilterModal";
import CategoryPieTooltip from "~/components/CategoryPieTooltip";
import { useTheme } from "~/lib/theme";

const CURRENCIES = ["NZD", "EUR", "USD", "GBP", "AUD"];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);

  // Stats params
  const month = Number(url.searchParams.get("month")) || new Date().getMonth() + 1;
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const currency = url.searchParams.get("currency") || undefined;

  // Transaction params
  const limit = Number(url.searchParams.get("limit")) || 10;
  const offset = Number(url.searchParams.get("offset")) || 0;
  const category = url.searchParams.get("category") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";

  let expenseData;
  if (category) {
    expenseData = await getExpensesByCategory(category, limit, offset);
  } else if (startDate && endDate) {
    expenseData = await getExpensesByDateRange(
      new Date(startDate),
      new Date(endDate),
      limit,
      offset,
    );
  } else {
    expenseData = await getExpenses(limit, offset);
  }

  const monthlyStats = await getMonthlyStats(month, year, currency);

  return {
    ...expenseData,
    monthlyStats,
    month,
    year,
    currentCurrency: currency || "",
    currentLimit: limit,
    currentOffset: offset,
    currentCategory: category,
    currentStartDate: startDate,
    currentEndDate: endDate,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const {
    expenses,
    total_count,
    monthlyStats,
    month,
    year,
    currentCurrency,
    currentLimit,
    currentOffset,
    currentCategory,
    currentStartDate,
    currentEndDate,
  } = useLoaderData<typeof clientLoader>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Local filter state
  const [filterCategory, setFilterCategory] = useState(currentCategory);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  const totalPages = Math.ceil(total_count / currentLimit) || 1;
  const currentPage = Math.floor(currentOffset / currentLimit) + 1;

  // Stats calculations
  const totalAllocated = monthlyStats.total_savings + monthlyStats.total_investment;
  const netBalance = monthlyStats.total_income - monthlyStats.total_spent - totalAllocated;
  const averagePerExpense = monthlyStats.expense_count > 0 ? monthlyStats.total_spent / monthlyStats.expense_count : 0;
  const savingsRate = monthlyStats.total_income > 0 ? (monthlyStats.total_savings / monthlyStats.total_income) * 100 : 0;
  const investmentRate = monthlyStats.total_income > 0 ? (monthlyStats.total_investment / monthlyStats.total_income) * 100 : 0;
  const allocationRate = monthlyStats.total_income > 0 ? (totalAllocated / monthlyStats.total_income) * 100 : 0;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // --- URL helpers ---
  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const m = overrides.month ?? month;
    const y = overrides.year ?? year;
    const c = overrides.currency ?? currentCurrency;
    params.set("month", String(m));
    params.set("year", String(y));
    if (c) params.set("currency", String(c));
    const lim = overrides.limit ?? currentLimit;
    const off = overrides.offset ?? currentOffset;
    const cat = overrides.category ?? currentCategory;
    const sd = overrides.startDate ?? currentStartDate;
    const ed = overrides.endDate ?? currentEndDate;
    params.set("limit", String(lim));
    if (Number(off)) params.set("offset", String(off));
    if (cat) params.set("category", String(cat));
    if (sd) params.set("startDate", String(sd));
    if (ed) params.set("endDate", String(ed));
    return `?${params.toString()}`;
  };

  const handleMonthChange = (newMonth: number) => navigate(buildUrl({ month: newMonth }));
  const handleYearChange = (newYear: number) => navigate(buildUrl({ year: newYear }));
  const handleCurrencyChange = (c: string) => navigate(buildUrl({ currency: c || undefined }));

  const goToPrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    navigate(buildUrl({ month: m, year: y }));
  };
  const goToNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    navigate(buildUrl({ month: m, year: y }));
  };

  const goToPage = (page: number) => {
    navigate(buildUrl({ offset: (page - 1) * currentLimit }));
  };

  const applyFilters = () => {
    navigate(buildUrl({ offset: 0, category: filterCategory, startDate, endDate }));
  };

  const clearFilters = () => {
    setFilterCategory("");
    setStartDate("");
    setEndDate("");
    navigate(buildUrl({ offset: 0, category: "", startDate: "", endDate: "" }));
  };

  // Percentage helper
  const getPercentageDisplay = (cat: string, total: number): string => {
    if (cat === "Savings" || cat === "Investment") {
      return monthlyStats.total_income > 0
        ? `${((total / monthlyStats.total_income) * 100).toFixed(1)}% of income`
        : "—";
    }
    return monthlyStats.total_spent > 0
      ? `${((total / monthlyStats.total_spent) * 100).toFixed(1)}%`
      : "0.0%";
  };

  // Pie data — exclude Income
  const pieData = monthlyStats.category_breakdown
    .filter((cat: any) => cat.category !== "Income")
    .map((cat: any) => ({
      category: cat.category,
      total: cat.total,
      count: cat.count,
      percentage: getPercentageDisplay(cat.category, cat.total),
      fill: getCategoryColor(cat.category, isDark),
      formatted: formatCurrency(cat.total, monthlyStats.currency),
    }));

  // CRUD
  const handleAdd = () => { setSelectedExpense(null); setIsFormModalOpen(true); };
  const handleRowClick = (expense: Expense) => { setSelectedExpense(expense); setIsFormModalOpen(true); };

  const handleFormSubmit = async (data: ExpenseCreate) => {
    setIsLoading(true);
    try {
      if (selectedExpense) await updateExpense(selectedExpense.id, data);
      else await createExpense(data);
      setIsFormModalOpen(false);
      revalidator.revalidate();
    } finally { setIsLoading(false); }
  };

  const handleDeleteFromModal = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteExpense(selectedExpense.id);
      setIsFormModalOpen(false);
      revalidator.revalidate();
    } finally { setIsLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteExpense(selectedExpense.id);
      setIsDeleteModalOpen(false);
      revalidator.revalidate();
    } finally { setIsLoading(false); }
  };

  const hasActiveFilters = !!(currentCategory || currentStartDate || currentEndDate);

  return (
    <div className="space-y-6">
      <title>Cofr | Dashboard</title>

      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-content-heading">
            {MONTHS_FULL[month - 1]} {year}
          </h2>
          <p className="text-sm text-content-tertiary mt-0.5">Financial overview</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency pill */}
          <select
            value={currentCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="h-9 px-3 border border-edge-strong rounded-lg text-xs font-medium text-content-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-emerald/40 transition-shadow"
          >
            <option value="">All Currencies</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Month/year navigation */}
          <div className="flex items-center bg-surface-primary border border-edge-strong rounded-lg overflow-hidden">
            <button
              onClick={goToPrevMonth}
              className="h-9 w-9 flex items-center justify-center hover:bg-surface-hover transition-colors text-content-tertiary hover:text-content-primary"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="h-9 w-px bg-edge-strong" />
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="h-9 pl-3 pr-1 text-xs font-medium text-content-primary bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="h-9 pl-1 pr-3 text-xs font-medium text-content-primary bg-transparent focus:outline-none cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="h-9 w-px bg-edge-strong" />
            <button
              onClick={goToNextMonth}
              className="h-9 w-9 flex items-center justify-center hover:bg-surface-hover transition-colors text-content-tertiary hover:text-content-primary"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Currency warning ─── */}
      {!currentCurrency && (
        <div className="flex items-center gap-2.5 bg-warning-bg border border-warning-border text-warning-text px-4 py-2.5 rounded-lg text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mixed currencies — select one for accurate totals.
        </div>
      )}

      {/* ─── Summary + Chart ─── */}
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {/* Cards — 2x2 on mobile, 2x2 on desktop beside pie */}
        <div className="grid grid-cols-2 gap-4">
          {/* Income */}
          <div className="rounded-xl border border-positive-border bg-positive-bg p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-positive-text-strong/70">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l2.828 2.818L15 13.182" />
              </svg>
              Income
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-positive-text-strong tabular-nums">
              {formatCurrency(monthlyStats.total_income, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-positive-text">Money received</p>
          </div>

          {/* Spent */}
          <div className="rounded-xl border border-edge-default bg-surface-primary p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18V6m3 2.818L12.172 6 9 8.818" />
              </svg>
              Spent
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-content-primary tabular-nums">
              {formatCurrency(monthlyStats.total_spent, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-content-tertiary">
              {monthlyStats.expense_count} tx · avg {formatCurrency(averagePerExpense, monthlyStats.currency)}
            </p>
          </div>

          {/* Allocated */}
          <div className="rounded-xl border border-accent/20 bg-accent-soft-bg p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-soft-text/70">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Allocated
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-accent-soft-text tabular-nums">
              {formatCurrency(totalAllocated, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-accent">
              {allocationRate.toFixed(0)}% · {savingsRate.toFixed(0)}% saved, {investmentRate.toFixed(0)}% invested
            </p>
          </div>

          {/* Remaining */}
          <div className="rounded-xl border border-edge-default bg-surface-primary p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              Remaining
            </div>
            <div className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums ${netBalance >= 0 ? "text-positive-text-strong" : "text-negative-text"}`}>
              {formatCurrency(netBalance, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-content-tertiary">
              {netBalance >= 0
                ? ["Vibes intact", "Wallet's breathing", "Still in the game", "Living within means", "Budget boss"][Math.abs(Math.floor(netBalance * 7)) % 5]
                : ["Wallet says ouch", "Ramen month activated", "Uh oh spaghettio", "Budget has left the chat", "Money machine broke"][Math.abs(Math.floor(netBalance * 7)) % 5]
              }
            </p>
          </div>
        </div>

        {/* Pie chart + legend */}
        <div className="rounded-xl border border-edge-default bg-surface-primary shadow-sm overflow-hidden p-2 sm:p-4">
          {pieData.length > 0 ? (
            <div className="flex flex-col h-full">

              {/* Title */}
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
                Category Breakdown
              </div>

              <div className="flex flex-col sm:flex-row flex-1 mt-3 gap-4">
                {/* Donut */}
                <div className="flex items-center justify-center flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height={275}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius="45%"
                        outerRadius="100%"
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieData.map((entry: any) => (
                          <Cell key={entry.category} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-col justify-center gap-2 sm:w-[200px] shrink-0">
                  {pieData.map((entry: any) => (
                    <div key={entry.category} className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-xs text-content-secondary truncate flex-1">{entry.category}</span>
                      <span className="text-[11px] font-medium text-content-primary tabular-nums shrink-0">
                        {entry.formatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 px-6">
              <div className="w-20 h-20 rounded-full border-[6px] border-edge-default" />
              <p className="text-xs text-content-muted text-center">No spending data this period</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Transactions ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-content-heading">Transactions</h3>
            <p className="text-xs text-content-tertiary mt-0.5">
              {total_count} total{hasActiveFilters ? " (filtered)" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-8 px-2.5 text-xs text-content-tertiary hover:text-negative-text hover:bg-negative-bg rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                hasActiveFilters
                  ? "bg-accent-soft-bg text-accent-soft-text"
                  : "hover:bg-surface-hover text-content-tertiary"
              }`}
              aria-label="Filter transactions"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={handleAdd}
              className="h-8 w-8 flex items-center justify-center bg-emerald text-white rounded-lg hover:bg-emerald-hover transition-colors"
              aria-label="Add transaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-edge-default bg-surface-primary shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-edge-default">
            <thead>
              <tr className="bg-surface-elevated">
                <th className="px-4 sm:px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">Date</th>
                <th className="px-4 sm:px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">Description</th>
                <th className="px-4 sm:px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">Category</th>
                <th className="px-4 sm:px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-default">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-content-tertiary">
                    No transactions found
                  </td>
                </tr>
              ) : (
                expenses.map((expense: Expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => handleRowClick(expense)}
                    className="cursor-pointer hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap text-xs text-content-tertiary tabular-nums">
                      {formatDate(expense.created_at)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap text-sm text-content-primary">
                      {expense.description ? truncateText(expense.description, 40) : <span className="text-content-muted">—</span>}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-primary">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getCategoryColor(expense.category, isDark) }}
                        />
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap text-sm font-medium text-content-primary text-right tabular-nums">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total_count >= 10 && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-3 border border-edge-strong rounded-lg text-xs font-medium text-content-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-tertiary tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <select
                value={currentLimit}
                onChange={(e) => navigate(buildUrl({ limit: Number(e.target.value), offset: 0 }))}
                className="h-7 px-1.5 border border-edge-strong rounded-md text-xs text-content-tertiary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-emerald/40 transition-shadow"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-3 border border-edge-strong rounded-lg text-xs font-medium text-content-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteFromModal}
        expense={selectedExpense}
        isLoading={isLoading}
      />
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        category={filterCategory}
        setCategory={setFilterCategory}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
