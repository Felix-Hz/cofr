import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import ControlsPanel, {
  getPresetDates,
  getPresetLabel,
  type Preset,
  shiftPreset,
} from "~/components/ControlsPanel";
import DeleteConfirmModal from "~/components/DeleteConfirmModal";
import { DashboardGrid } from "~/components/dashboard/DashboardGrid";
import { EditModeToolbar } from "~/components/dashboard/EditModeToolbar";
import { WidgetGallery } from "~/components/dashboard/WidgetGallery";
import { ensureWidgetsRegistered } from "~/components/dashboard/widgets/registerAll";
import ExchangeRatesModal from "~/components/ExchangeRatesModal";
import ExpenseFormModal from "~/components/ExpenseFormModal";
import ExportModal from "~/components/ExportModal";
import Tooltip from "~/components/Tooltip";
import TransferFormModal from "~/components/TransferFormModal";
import {
  createExpense,
  createTransfer,
  deleteExpense,
  deleteTransfer,
  getDashboardLayout,
  getExpenses,
  getLifetimeStats,
  getRangeStats,
  getSpendSparkline,
  updateDashboardLayout,
  updateExpense,
  updateTransfer,
} from "~/lib/api";
import { useCategories } from "~/lib/categories";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import { DashboardDataProvider } from "~/lib/dashboard/data-context";
import { repackWidgets } from "~/lib/dashboard/grid";
import { WIDGET_META } from "~/lib/dashboard/registry";
import type {
  DashboardSpace,
  DashboardWidget,
  Expense,
  ExpenseCreate,
  TransferCreate,
  WidgetType,
} from "~/lib/schemas";

const CURRENCIES = [...SUPPORTED_CURRENCIES];

ensureWidgetsRegistered();

export function meta() {
  return [{ title: "cofr — Dashboard" }];
}

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);

  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const startDate = url.searchParams.get("startDate") || defaultStart;
  const endDate = url.searchParams.get("endDate") || defaultEnd;
  const preset = (url.searchParams.get("preset") || "thisMonth") as Preset;
  const currency = url.searchParams.get("currency") || undefined;

  const limit = Number(url.searchParams.get("limit")) || 10;
  const offset = Number(url.searchParams.get("offset")) || 0;
  const category = url.searchParams.get("category") || "";
  const minAmount = url.searchParams.get("minAmount");
  const maxAmount = url.searchParams.get("maxAmount");

  const [expenseData, rangeStats, lifetimeStats, sparkline, layout] = await Promise.all([
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
    getLifetimeStats(currency),
    getSpendSparkline(startDate + "T00:00:00", endDate + "T23:59:59", currency),
    getDashboardLayout(),
  ]);

  return {
    ...expenseData,
    monthlyStats: rangeStats,
    lifetimeStats,
    sparkline,
    layout,
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

function ToolbarButton({
  label,
  onClick,
  tone = "default",
  icon,
  active = false,
  className,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "accent" | "emerald";
  icon: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  const base = "h-9 w-9 flex items-center justify-center rounded-lg transition-colors shrink-0";
  const toneStyles =
    tone === "emerald"
      ? "bg-emerald text-white hover:bg-emerald-hover"
      : tone === "accent"
        ? "border border-accent/30 text-accent hover:bg-accent-soft-bg"
        : active
          ? "bg-emerald text-white"
          : "border border-edge-strong text-content-tertiary hover:bg-surface-hover hover:text-content-primary";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`${base} ${toneStyles} ${className ?? ""}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export default function Dashboard() {
  const rawNavigate = useNavigate();
  const navigate = (to: string) => rawNavigate(to, { preventScrollReset: true, replace: true });
  const revalidator = useRevalidator();
  const {
    expenses,
    total_count,
    limit: loaderLimit,
    offset: loaderOffset,
    monthlyStats,
    lifetimeStats,
    sparkline,
    layout,
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
  const { categories } = useCategories();

  // --- Layout state (locally mutable so drag/drop feels instant) ---
  const [spaces, setSpaces] = useState<DashboardSpace[]>(layout.spaces);
  useEffect(() => {
    setSpaces(layout.spaces);
  }, [layout]);

  const activeSpace = spaces.find((s) => s.is_default) ?? spaces[0];
  const widgets = activeSpace?.widgets ?? [];

  const [isEditMode, setIsEditMode] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const controlsToggleRef = useRef<HTMLButtonElement>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

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

  const handleCategoryFilterChange = (v: string) => navigate(buildUrl({ offset: 0, category: v }));
  const handleMinAmountChange = (v: string) => navigate(buildUrl({ offset: 0, minAmount: v }));
  const handleMaxAmountChange = (v: string) => navigate(buildUrl({ offset: 0, maxAmount: v }));
  const clearFilters = () =>
    navigate(buildUrl({ offset: 0, category: "", minAmount: "", maxAmount: "" }));

  // --- CRUD ---
  const handleAdd = () => {
    setSelectedExpense(null);
    setIsFormModalOpen(true);
  };
  const handleTransfer = () => {
    setSelectedExpense(null);
    setIsTransferModalOpen(true);
  };
  const handleExpenseEdit = useCallback((expense: Expense) => {
    if (expense.is_transfer) {
      setSelectedExpense(expense);
      setIsTransferModalOpen(true);
    } else {
      setSelectedExpense(expense);
      setIsFormModalOpen(true);
    }
  }, []);
  const handleExpenseDelete = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  }, []);

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
  const handleTransferSubmit = async (data: TransferCreate) => {
    setIsLoading(true);
    try {
      if (selectedExpense) await updateTransfer(selectedExpense.id, data);
      else await createTransfer(data);
      setIsTransferModalOpen(false);
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
  const handleTransferDelete = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteTransfer(selectedExpense.id);
      setIsTransferModalOpen(false);
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

  // --- Layout mutation ---
  const persistLayout = useCallback(
    async (next: DashboardWidget[]) => {
      if (!activeSpace) return;
      setIsSaving(true);
      try {
        const updated = await updateDashboardLayout({
          spaces: spaces.map((s) =>
            s.id === activeSpace.id
              ? {
                  id: s.id,
                  name: s.name,
                  position: s.position,
                  is_default: s.is_default,
                  widgets: next.map((w) => ({
                    widget_type: w.widget_type,
                    col_x: w.col_x,
                    col_y: w.col_y,
                    col_span: w.col_span,
                    row_span: w.row_span,
                    config: w.config ?? null,
                  })),
                }
              : {
                  id: s.id,
                  name: s.name,
                  position: s.position,
                  is_default: s.is_default,
                  widgets: s.widgets.map((w) => ({
                    widget_type: w.widget_type,
                    col_x: w.col_x,
                    col_y: w.col_y,
                    col_span: w.col_span,
                    row_span: w.row_span,
                    config: w.config ?? null,
                  })),
                },
          ),
        });
        setSpaces(updated.spaces);
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    },
    [activeSpace, spaces],
  );

  const handleReorder = useCallback(
    (next: DashboardWidget[]) => {
      if (!activeSpace) return;
      setSpaces((prev) => prev.map((s) => (s.id === activeSpace.id ? { ...s, widgets: next } : s)));
      setIsDirty(true);
      void persistLayout(next);
    },
    [activeSpace, persistLayout],
  );

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      if (!activeSpace) return;
      const meta = WIDGET_META[type];
      const tempId = `pending-${type}-${Date.now()}`;
      const next = repackWidgets([
        ...widgets,
        {
          id: tempId,
          widget_type: type,
          col_x: 0,
          col_y: Number.POSITIVE_INFINITY,
          col_span: meta.size.defaultColSpan,
          row_span: meta.size.defaultRowSpan,
          config: null,
        } as DashboardWidget,
      ]);
      setSpaces((prev) => prev.map((s) => (s.id === activeSpace.id ? { ...s, widgets: next } : s)));
      setIsDirty(true);
      setIsGalleryOpen(false);
      void persistLayout(next);
    },
    [activeSpace, widgets, persistLayout],
  );

  const activeTypes = useMemo(() => new Set(widgets.map((w) => w.widget_type)), [widgets]);

  const hasActiveFilters = !!(currentCategory || currentMinAmount || currentMaxAmount);
  const periodLabel = getPresetLabel(preset, startDate, endDate);
  const showArrows = preset !== "custom";

  const dashboardData = {
    periodStats: monthlyStats,
    lifetimeStats,
    expenses,
    expensesTotal: total_count,
    expensesLimit: loaderLimit,
    expensesOffset: loaderOffset,
    accountBalances: monthlyStats.account_balances || [],
    sparkline,
    startDate,
    endDate,
    currency: currentCurrency || null,
    preferredCurrency: monthlyStats.currency,
    onExpenseEdit: handleExpenseEdit,
    onExpenseDelete: handleExpenseDelete,
    onCreateExpense: handleAdd,
    onCreateTransfer: handleTransfer,
  };

  return (
    <DashboardDataProvider value={dashboardData}>
      <div className="space-y-6 pb-24">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {showArrows && (
              <ToolbarButton
                label="Previous period"
                onClick={goToPrev}
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                }
              />
            )}

            <div className="min-w-0">
              <h2
                className={`truncate font-bold tracking-tight text-content-heading sm:text-2xl ${
                  periodLabel.length > (showArrows ? 16 : 22) ? "text-base" : "text-xl"
                }`}
              >
                {periodLabel}
              </h2>
              <p className="mt-0.5 hidden text-sm text-content-tertiary sm:block">
                Financial overview
              </p>
            </div>

            {showArrows && (
              <ToolbarButton
                label="Next period"
                onClick={goToNext}
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                }
              />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden h-7 items-center rounded-full bg-accent-soft-bg px-2.5 text-[11px] font-medium text-accent-soft-text sm:flex">
              {
                {
                  thisMonth: "Monthly",
                  last7Days: "Weekly",
                  lastYear: "Yearly",
                  custom: "Custom",
                }[preset]
              }
            </span>
            <span className="hidden h-7 items-center rounded-full bg-accent-soft-bg px-2.5 text-[11px] font-medium text-accent-soft-text sm:flex">
              {currentCurrency || "All"}
            </span>

            <ToolbarButton
              label={isEditMode ? "Exit edit mode" : "Edit dashboard"}
              onClick={() => setIsEditMode((v) => !v)}
              active={isEditMode}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              }
            />

            <ToolbarButton
              label="Export data"
              onClick={() => setIsExportModalOpen(true)}
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            />

            <div className="relative">
              <Tooltip content="Filters & controls">
                <button
                  type="button"
                  ref={controlsToggleRef}
                  onClick={() => setIsControlsOpen(!isControlsOpen)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    isControlsOpen
                      ? "bg-emerald text-white"
                      : "border border-edge-strong text-content-tertiary hover:bg-surface-hover hover:text-content-primary"
                  }`}
                  aria-label="Filters & controls"
                >
                  <svg
                    className="h-4 w-4"
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
                  {hasActiveFilters && (
                    <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-accent" />
                  )}
                </button>
              </Tooltip>

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
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                category={currentCategory}
                onCategoryChange={handleCategoryFilterChange}
                minAmount={currentMinAmount}
                onMinAmountChange={handleMinAmountChange}
                maxAmount={currentMaxAmount}
                onMaxAmountChange={handleMaxAmountChange}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
              />
            </div>

            <ToolbarButton
              label="Transfer between accounts"
              onClick={handleTransfer}
              tone="accent"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              }
            />
            <ToolbarButton
              label="Add an expense"
              onClick={handleAdd}
              tone="emerald"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            />
          </div>
        </div>

        {/* ─── Currency info ─── */}
        {!currentCurrency && monthlyStats.is_converted && (
          <div className="hidden items-center gap-2.5 rounded-lg border border-accent/20 bg-accent-soft-bg px-4 py-2.5 text-xs text-accent-soft-text sm:flex">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Totals converted to {monthlyStats.currency} at approximate rates. Select a specific
              currency to view only those transactions, or{" "}
              <button
                type="button"
                onClick={() => setIsRatesModalOpen(true)}
                className="cursor-pointer font-medium underline hover:text-accent"
              >
                view daily rates
              </button>
              .
            </span>
          </div>
        )}

        {/* ─── Composable widget grid ─── */}
        <DashboardGrid widgets={widgets} isEditMode={isEditMode} onReorder={handleReorder} />

        {/* ─── Modals & floating surfaces ─── */}
        <EditModeToolbar
          isEditMode={isEditMode}
          onExit={() => setIsEditMode(false)}
          onOpenGallery={() => setIsGalleryOpen(true)}
          isDirty={isDirty}
          isSaving={isSaving}
        />
        <WidgetGallery
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          onAdd={handleAddWidget}
          activeTypes={activeTypes}
        />

        <ExpenseFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteFromModal}
          expense={selectedExpense}
          isLoading={isLoading}
        />
        <TransferFormModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSubmit={handleTransferSubmit}
          onDelete={handleTransferDelete}
          expense={selectedExpense}
          isLoading={isLoading}
        />
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          isLoading={isLoading}
        />
        <ExchangeRatesModal
          isOpen={isRatesModalOpen}
          onClose={() => setIsRatesModalOpen(false)}
          preferredCurrency={monthlyStats.currency}
        />
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          transactionCount={total_count}
          defaultFilters={{
            startDate: startDate,
            endDate: endDate,
            categoryId: currentCategory || undefined,
            currency: currentCurrency || undefined,
          }}
        />
      </div>
    </DashboardDataProvider>
  );
}
