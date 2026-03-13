import { useRef, useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import CategoryPieTooltip from "~/components/CategoryPieTooltip";
import ControlsPanel, {
  getPresetDates,
  getPresetLabel,
  type Preset,
  shiftPreset,
} from "~/components/ControlsPanel";
import DeleteConfirmModal from "~/components/DeleteConfirmModal";
import ExpenseFormModal from "~/components/ExpenseFormModal";
import FilterModal from "~/components/FilterModal";
import { createExpense, deleteExpense, getExpenses, getRangeStats, updateExpense } from "~/lib/api";
import { useCategories } from "~/lib/categories";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import type { Expense, ExpenseCreate } from "~/lib/schemas";
import { useTheme } from "~/lib/theme";
import { formatCurrency, formatDate, isPositiveType, truncateText } from "~/lib/utils";

const CURRENCIES = [...SUPPORTED_CURRENCIES];

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);

  // Date range params (default to current month)
  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const startDate = url.searchParams.get("startDate") || defaultStart;
  const endDate = url.searchParams.get("endDate") || defaultEnd;
  const preset = (url.searchParams.get("preset") || "thisMonth") as Preset;
  const currency = url.searchParams.get("currency") || undefined;

  // Transaction params
  const limit = Number(url.searchParams.get("limit")) || 10;
  const offset = Number(url.searchParams.get("offset")) || 0;
  const category = url.searchParams.get("category") || "";
  const minAmount = url.searchParams.get("minAmount");
  const maxAmount = url.searchParams.get("maxAmount");

  const [expenseData, rangeStats] = await Promise.all([
    getExpenses({
      limit,
      offset,
      startDate: startDate + "T00:00:00",
      endDate: endDate + "T23:59:59",
      category: category || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
    }),
    getRangeStats(startDate + "T00:00:00", endDate + "T23:59:59", currency),
  ]);

  return {
    ...expenseData,
    monthlyStats: rangeStats,
    startDate,
    endDate,
    preset,
    currentCurrency: currency || "",
    currentLimit: limit,
    currentOffset: offset,
    currentCategory: category,
    currentMinAmount: minAmount || "",
    currentMaxAmount: maxAmount || "",
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const {
    expenses,
    total_count,
    monthlyStats,
    startDate,
    endDate,
    preset,
    currentCurrency,
    currentLimit,
    currentOffset,
    currentCategory,
    currentMinAmount,
    currentMaxAmount,
  } = useLoaderData<typeof clientLoader>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { categories } = useCategories();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const controlsToggleRef = useRef<HTMLButtonElement>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Local filter state
  const [filterCategory, setFilterCategory] = useState(currentCategory);
  const [filterMinAmount, setFilterMinAmount] = useState(currentMinAmount);
  const [filterMaxAmount, setFilterMaxAmount] = useState(currentMaxAmount);

  // Custom range local state (for ControlsPanel inputs)
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const totalPages = Math.ceil(total_count / currentLimit) || 1;
  const currentPage = Math.floor(currentOffset / currentLimit) + 1;

  // Stats calculations
  const totalAllocated = monthlyStats.total_savings + monthlyStats.total_investment;
  const netBalance = monthlyStats.total_income - monthlyStats.total_spent - totalAllocated;
  const averagePerExpense =
    monthlyStats.expense_count > 0 ? monthlyStats.total_spent / monthlyStats.expense_count : 0;
  const savingsRate =
    monthlyStats.total_income > 0
      ? (monthlyStats.total_savings / monthlyStats.total_income) * 100
      : 0;
  const investmentRate =
    monthlyStats.total_income > 0
      ? (monthlyStats.total_investment / monthlyStats.total_income) * 100
      : 0;
  const allocationRate =
    monthlyStats.total_income > 0 ? (totalAllocated / monthlyStats.total_income) * 100 : 0;

  // --- URL helpers ---
  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const sd = overrides.startDate ?? startDate;
    const ed = overrides.endDate ?? endDate;
    const p = overrides.preset ?? preset;
    const c = overrides.currency ?? currentCurrency;
    params.set("startDate", String(sd));
    params.set("endDate", String(ed));
    params.set("preset", String(p));
    if (c) params.set("currency", String(c));
    const lim = overrides.limit ?? currentLimit;
    const off = overrides.offset ?? currentOffset;
    const cat = overrides.category ?? currentCategory;
    const minA = overrides.minAmount ?? currentMinAmount;
    const maxA = overrides.maxAmount ?? currentMaxAmount;
    params.set("limit", String(lim));
    if (Number(off)) params.set("offset", String(off));
    if (cat) params.set("category", String(cat));
    if (minA) params.set("minAmount", String(minA));
    if (maxA) params.set("maxAmount", String(maxA));
    return `?${params.toString()}`;
  };

  const handlePresetChange = (newPreset: Preset) => {
    if (newPreset === "custom") {
      navigate(
        buildUrl({ preset: "custom", startDate: customStart, endDate: customEnd, offset: 0 }),
      );
    } else {
      const { startDate: sd, endDate: ed } = getPresetDates(newPreset);
      setCustomStart(sd);
      setCustomEnd(ed);
      navigate(buildUrl({ preset: newPreset, startDate: sd, endDate: ed, offset: 0 }));
    }
  };

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value);
    if (value && customEnd) {
      navigate(buildUrl({ preset: "custom", startDate: value, endDate: customEnd, offset: 0 }));
    }
  };

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value);
    if (customStart && value) {
      navigate(buildUrl({ preset: "custom", startDate: customStart, endDate: value, offset: 0 }));
    }
  };

  const handleCurrencyChange = (c: string) => navigate(buildUrl({ currency: c }));

  const goToPrev = () => {
    if (preset === "custom") return;
    const { startDate: sd, endDate: ed } = shiftPreset(preset, startDate, -1);
    setCustomStart(sd);
    setCustomEnd(ed);
    navigate(buildUrl({ startDate: sd, endDate: ed, offset: 0 }));
  };

  const goToNext = () => {
    if (preset === "custom") return;
    const { startDate: sd, endDate: ed } = shiftPreset(preset, startDate, 1);
    setCustomStart(sd);
    setCustomEnd(ed);
    navigate(buildUrl({ startDate: sd, endDate: ed, offset: 0 }));
  };

  const goToPage = (page: number) => {
    navigate(buildUrl({ offset: (page - 1) * currentLimit }));
  };

  const applyFilters = () => {
    navigate(
      buildUrl({
        offset: 0,
        category: filterCategory,
        minAmount: filterMinAmount,
        maxAmount: filterMaxAmount,
      }),
    );
  };

  const clearFilters = () => {
    setFilterCategory("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
    navigate(buildUrl({ offset: 0, category: "", minAmount: "", maxAmount: "" }));
  };

  // Percentage helper
  const getPercentageDisplay = (catType: string, total: number): string => {
    if (catType === "savings" || catType === "investment") {
      return monthlyStats.total_income > 0
        ? `${((total / monthlyStats.total_income) * 100).toFixed(1)}% of income`
        : "—";
    }
    return monthlyStats.total_spent > 0
      ? `${((total / monthlyStats.total_spent) * 100).toFixed(1)}%`
      : "0.0%";
  };

  // Pie data — exclude income type
  const pieData = monthlyStats.category_breakdown
    .filter((cat) => cat.category_type !== "income")
    .map((cat) => ({
      category: cat.category,
      total: cat.total,
      count: cat.count,
      percentage: getPercentageDisplay(cat.category_type, cat.total),
      fill: isDark ? cat.category_color_dark : cat.category_color_light,
      formatted: formatCurrency(cat.total, monthlyStats.currency),
    }));

  // CRUD
  const handleAdd = () => {
    setSelectedExpense(null);
    setIsFormModalOpen(true);
  };
  const handleRowClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (data: ExpenseCreate) => {
    setIsLoading(true);
    try {
      if (selectedExpense) await updateExpense(selectedExpense.id, data);
      else await createExpense(data);
      setIsFormModalOpen(false);
      revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteExpense(selectedExpense.id);
      setIsFormModalOpen(false);
      revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteExpense(selectedExpense.id);
      setIsDeleteModalOpen(false);
      revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters = !!(currentCategory || currentMinAmount || currentMaxAmount);
  const periodLabel = getPresetLabel(preset, startDate, endDate);
  const showArrows = preset !== "custom";

  // Find category name for active filter display
  const activeCategoryName = currentCategory
    ? categories.find((c) => c.id === currentCategory)?.name
    : null;

  return (
    <div className="space-y-6 pb-16">
      <title>Cofr | Dashboard</title>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Prev arrow */}
          {showArrows && (
            <button
              onClick={goToPrev}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors text-content-tertiary hover:text-content-primary shrink-0"
              aria-label="Previous period"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-heading truncate">
              {periodLabel}
            </h2>
            <p className="text-sm text-content-tertiary mt-0.5 hidden sm:block">
              Financial overview
            </p>
          </div>

          {/* Next arrow */}
          {showArrows && (
            <button
              onClick={goToNext}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors text-content-tertiary hover:text-content-primary shrink-0"
              aria-label="Next period"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Always-visible badges */}
          <span className="h-7 px-2.5 flex items-center text-[11px] font-medium text-accent-soft-text bg-accent-soft-bg rounded-full">
            {
              { thisMonth: "Monthly", last7Days: "Weekly", lastYear: "Yearly", custom: "Custom" }[
                preset
              ]
            }
          </span>
          <span className="h-7 px-2.5 flex items-center text-[11px] font-medium text-accent-soft-text bg-accent-soft-bg rounded-full">
            {currentCurrency || "All"}
          </span>

          {/* Controls toggle */}
          <div className="relative">
            <button
              ref={controlsToggleRef}
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                isControlsOpen
                  ? "bg-emerald text-white"
                  : "border border-edge-strong hover:bg-surface-hover text-content-tertiary hover:text-content-primary"
              }`}
              aria-label="Controls"
            >
              {/* Sliders icon */}
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="8" cy="7" r="2" fill="currentColor" />
                <circle cx="16" cy="12" r="2" fill="currentColor" />
                <circle cx="10" cy="17" r="2" fill="currentColor" />
              </svg>
            </button>

            <ControlsPanel
              isOpen={isControlsOpen}
              onClose={() => setIsControlsOpen(false)}
              toggleRef={controlsToggleRef}
              preset={preset}
              onPresetChange={handlePresetChange}
              currency={currentCurrency}
              onCurrencyChange={handleCurrencyChange}
              customStart={customStart}
              customEnd={customEnd}
              onCustomStartChange={handleCustomStartChange}
              onCustomEndChange={handleCustomEndChange}
              currencies={CURRENCIES}
            />
          </div>

          {/* Mobile-only add button */}
          <button
            onClick={handleAdd}
            className="h-9 w-9 flex items-center justify-center bg-emerald text-white rounded-lg hover:bg-emerald-hover transition-colors sm:hidden"
            aria-label="Add transaction"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Currency info ─── */}
      {!currentCurrency && monthlyStats.is_converted && (
        <div className="flex items-center gap-2.5 bg-accent-soft-bg border border-accent/20 text-accent-soft-text px-4 py-2.5 rounded-lg text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Totals converted to {monthlyStats.currency} at approximate rates. Select a specific
          currency to view only those transactions.
        </div>
      )}

      {/* ─── Summary + Chart ─── */}
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {/* Cards — 2x2 on mobile, 2x2 on desktop beside pie */}
        <div className="grid grid-cols-2 gap-4">
          {/* Income */}
          <div className="rounded-xl border border-positive-border bg-positive-bg p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-positive-text-strong/70">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l2.828 2.818L15 13.182"
                />
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
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18V6m3 2.818L12.172 6 9 8.818"
                />
              </svg>
              Spent
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-content-primary tabular-nums">
              {formatCurrency(monthlyStats.total_spent, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-content-tertiary">
              {monthlyStats.expense_count} tx · avg{" "}
              {formatCurrency(averagePerExpense, monthlyStats.currency)}
            </p>
          </div>

          {/* Allocated */}
          <div className="rounded-xl border border-accent/20 bg-accent-soft-bg p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-soft-text/70">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Allocated
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-accent-soft-text tabular-nums">
              {formatCurrency(totalAllocated, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-accent">
              {allocationRate.toFixed(0)}% · {savingsRate.toFixed(0)}% saved,{" "}
              {investmentRate.toFixed(0)}% invested
            </p>
          </div>

          {/* Remaining */}
          <div className="rounded-xl border border-edge-default bg-surface-primary p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
              Remaining
            </div>
            <div
              className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums ${netBalance >= 0 ? "text-positive-text-strong" : "text-negative-text"}`}
            >
              {formatCurrency(netBalance, monthlyStats.currency)}
            </div>
            <p className="mt-1 text-[11px] text-content-tertiary">
              {netBalance >= 0
                ? [
                    "Vibes intact",
                    "Wallet's breathing",
                    "Still in the game",
                    "Living within means",
                    "Budget boss",
                  ][Math.abs(Math.floor(netBalance * 7)) % 5]
                : [
                    "Wallet says ouch",
                    "Ramen month activated",
                    "Uh oh spaghettio",
                    "Budget has left the chat",
                    "Money machine broke",
                  ][Math.abs(Math.floor(netBalance * 7)) % 5]}
            </p>
          </div>
        </div>

        {/* Pie chart + legend */}
        <div className="rounded-xl border border-edge-default bg-surface-primary shadow-sm overflow-hidden p-2 sm:p-4">
          {pieData.length > 0 ? (
            <div className="flex flex-col h-full">
              {/* Title */}
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                  />
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
                      />
                      <Tooltip content={<CategoryPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-col justify-center gap-2 sm:w-[200px] shrink-0">
                  {pieData.map((entry) => (
                    <div key={entry.category} className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-xs text-content-secondary truncate flex-1">
                        {entry.category}
                      </span>
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
              {total_count} total
              {hasActiveFilters
                ? ` (filtered${activeCategoryName ? `: ${activeCategoryName}` : ""})`
                : ""}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
            <button
              onClick={handleAdd}
              className="h-8 w-8 flex items-center justify-center bg-emerald text-white rounded-lg hover:bg-emerald-hover transition-colors"
              aria-label="Add transaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-edge-default bg-surface-primary shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-edge-default">
            <thead>
              <tr className="bg-surface-elevated">
                <th className="px-3 sm:px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Date
                </th>
                <th className="hidden sm:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Description
                </th>
                <th className="px-3 sm:px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Category
                </th>
                <th className="px-3 sm:px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
                  Amount
                </th>
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
                expenses.map((expense: Expense) => {
                  const isPositive = isPositiveType(expense.category_type);
                  const catColor = isDark
                    ? expense.category_color_dark
                    : expense.category_color_light;
                  return (
                    <tr
                      key={expense.id}
                      onClick={() => handleRowClick(expense)}
                      className={`cursor-pointer transition-colors ${
                        isPositive
                          ? "bg-positive-bg/50 hover:bg-positive-bg"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <td className="px-3 sm:px-5 py-3 whitespace-nowrap text-xs text-content-tertiary tabular-nums">
                        <span className="sm:hidden">
                          {formatDate(expense.created_at, "compact")}
                        </span>
                        <span className="hidden sm:inline">{formatDate(expense.created_at)}</span>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 whitespace-nowrap text-sm text-content-primary">
                        {expense.description ? (
                          truncateText(expense.description, 40)
                        ) : (
                          <span className="text-content-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-primary">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          {expense.category_name}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-content-primary text-right tabular-nums">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                    </tr>
                  );
                })
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
                  <option key={n} value={n}>
                    {n} / page
                  </option>
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
        minAmount={filterMinAmount}
        setMinAmount={setFilterMinAmount}
        maxAmount={filterMaxAmount}
        setMaxAmount={setFilterMaxAmount}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
