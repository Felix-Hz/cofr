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
import { DashboardSpacesBar } from "~/components/dashboard/DashboardSpacesBar";
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
import {
  buildDashboardLayoutUpdate,
  cloneDashboardSpaces,
  createDashboardSpace,
  normalizeDashboardSpaces,
  removeDashboardSpace,
} from "~/lib/dashboard/layout-state";
import { clampWidgetSize, WIDGET_META } from "~/lib/dashboard/registry";
import type {
  DashboardSpace,
  DashboardWidget,
  Expense,
  ExpenseCreate,
  TransferCreate,
  WidgetType,
} from "~/lib/schemas";

const CURRENCIES = [...SUPPORTED_CURRENCIES];
const TRANSACTIONS_PAGE_SIZE_OPTIONS = [10, 25, 50];

ensureWidgetsRegistered();

const SPACE_NAME_MAX_LENGTH = 32;

function createPendingSpaceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pending-space-${crypto.randomUUID()}`;
  }
  return `pending-space-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const base =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-[background-color,color,border-color] duration-200";
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
  const navigate = useCallback(
    (to: string) => rawNavigate(to, { preventScrollReset: true, replace: true }),
    [rawNavigate],
  );
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

  const [isEditMode, setIsEditMode] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [layoutSaveError, setLayoutSaveError] = useState<string | null>(null);
  const [savedSpaces, setSavedSpaces] = useState<DashboardSpace[]>(() =>
    normalizeDashboardSpaces(layout.spaces),
  );
  const [draftSpaces, setDraftSpaces] = useState<DashboardSpace[]>(() =>
    normalizeDashboardSpaces(layout.spaces),
  );
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(
    () => layout.spaces.find((space) => space.is_default)?.id ?? layout.spaces[0]?.id ?? null,
  );
  const [pendingRemoval, setPendingRemoval] = useState<DashboardWidget | null>(null);
  const [pendingSpaceRemoval, setPendingSpaceRemoval] = useState<DashboardSpace | null>(null);
  const [isConversionBannerDismissed, setIsConversionBannerDismissed] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const mobileControlsToggleRef = useRef<HTMLButtonElement>(null);
  const desktopControlsToggleRef = useRef<HTMLButtonElement>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const draftSpacesRef = useRef<DashboardSpace[]>(draftSpaces);
  const activeSpaceIdRef = useRef<string | null>(activeSpaceId);
  const isDirtyRef = useRef(isDirty);

  const setDraftSpacesSynced = useCallback((value: DashboardSpace[]) => {
    draftSpacesRef.current = value;
    setDraftSpaces(value);
  }, []);

  const setActiveSpaceIdSynced = useCallback((value: string | null) => {
    activeSpaceIdRef.current = value;
    setActiveSpaceId(value);
  }, []);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsConversionBannerDismissed(
      window.localStorage.getItem("cofr:hide-conversion-banner") === "1",
    );
  }, []);

  useEffect(() => {
    const nextSavedSpaces = normalizeDashboardSpaces(layout.spaces);
    setSavedSpaces(nextSavedSpaces);
    if (!isDirtyRef.current) {
      setDraftSpacesSynced(nextSavedSpaces);
    }
  }, [layout, setDraftSpacesSynced]);

  useEffect(() => {
    if (draftSpaces.length === 0) {
      setActiveSpaceIdSynced(null);
      return;
    }

    if (activeSpaceId && draftSpaces.some((space) => space.id === activeSpaceId)) {
      return;
    }

    setActiveSpaceIdSynced(
      draftSpaces.find((space) => space.is_default)?.id ?? draftSpaces[0]?.id ?? null,
    );
  }, [activeSpaceId, draftSpaces, setActiveSpaceIdSynced]);

  const activeSpace = draftSpaces.find((space) => space.id === activeSpaceId) ?? draftSpaces[0];
  const widgets = activeSpace?.widgets ?? [];

  const navigateSpace = useCallback(
    (direction: -1 | 1) => {
      if (draftSpaces.length <= 1) return;
      const currentIndex = Math.max(
        0,
        draftSpaces.findIndex((space) => space.id === activeSpaceId),
      );
      const nextIndex = (currentIndex + direction + draftSpaces.length) % draftSpaces.length;
      setActiveSpaceIdSynced(draftSpaces[nextIndex]?.id ?? activeSpaceId);
    },
    [activeSpaceId, draftSpaces, setActiveSpaceIdSynced],
  );

  useEffect(() => {
    if (draftSpaces.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateSpace(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateSpace(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draftSpaces.length, navigateSpace]);

  // --- URL helpers ---
  const buildUrl = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
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
    },
    [
      currentCategory,
      currentCurrency,
      currentLimit,
      currentMaxAmount,
      currentMinAmount,
      currentOffset,
      endDate,
      preset,
      startDate,
    ],
  );

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
  const handleTransactionsPageChange = useCallback(
    (nextOffset: number) => {
      navigate(buildUrl({ offset: Math.max(0, nextOffset) }));
    },
    [navigate, buildUrl],
  );
  const handleTransactionsPageSizeChange = useCallback(
    (nextLimit: number) => {
      const normalizedLimit = TRANSACTIONS_PAGE_SIZE_OPTIONS.includes(nextLimit) ? nextLimit : 10;
      navigate(buildUrl({ limit: normalizedLimit, offset: 0 }));
    },
    [navigate, buildUrl],
  );

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
  const updateDraftLayout = useCallback(
    (updater: (spaces: DashboardSpace[]) => DashboardSpace[]) => {
      const nextSpaces = normalizeDashboardSpaces(updater(draftSpacesRef.current));
      setDraftSpacesSynced(nextSpaces);
      setIsDirty(true);
      setLayoutSaveError(null);
    },
    [setDraftSpacesSynced],
  );

  const persistLayout = useCallback(
    async (exitAfter = false) => {
      const currentDraftSpaces = draftSpacesRef.current;
      const currentActiveSpaceId = activeSpaceIdRef.current;
      if (currentDraftSpaces.length === 0) return;
      const activeSpaceIndex = Math.max(
        0,
        currentDraftSpaces.findIndex((space) => space.id === currentActiveSpaceId),
      );
      setIsSaving(true);
      setLayoutSaveError(null);
      try {
        const updated = await updateDashboardLayout(buildDashboardLayoutUpdate(currentDraftSpaces));
        const nextSpaces = cloneDashboardSpaces(updated.spaces);
        setSavedSpaces(nextSpaces);
        setDraftSpacesSynced(nextSpaces);
        setIsDirty(false);
        setActiveSpaceIdSynced(
          nextSpaces[activeSpaceIndex]?.id ??
            nextSpaces.find((space) => space.is_default)?.id ??
            nextSpaces[0]?.id ??
            null,
        );
        if (exitAfter) {
          setIsEditMode(false);
          setIsGalleryOpen(false);
        }
      } catch (error) {
        setLayoutSaveError(
          error instanceof Error ? error.message : "Couldn't save dashboard layout.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [setActiveSpaceIdSynced, setDraftSpacesSynced],
  );

  const handleDiscardLayout = useCallback(() => {
    const nextSpaces = cloneDashboardSpaces(savedSpaces);
    setDraftSpacesSynced(nextSpaces);
    setIsDirty(false);
    setLayoutSaveError(null);
    setPendingRemoval(null);
    setPendingSpaceRemoval(null);
    setActiveSpaceIdSynced(
      nextSpaces.find((space) => space.name === activeSpace?.name)?.id ??
        nextSpaces.find((space) => space.is_default)?.id ??
        nextSpaces[0]?.id ??
        null,
    );
  }, [activeSpace?.name, savedSpaces, setActiveSpaceIdSynced, setDraftSpacesSynced]);

  const handleToggleEditMode = useCallback(() => {
    if (!isEditMode) {
      setIsEditMode(true);
      return;
    }

    if (isDirty) {
      void persistLayout(true);
      return;
    }

    setIsEditMode(false);
    setIsGalleryOpen(false);
  }, [isDirty, isEditMode, persistLayout]);

  const updateActiveSpaceWidgets = useCallback(
    (updater: (widgets: DashboardWidget[]) => DashboardWidget[]) => {
      if (!activeSpaceId) return;
      updateDraftLayout((prev) =>
        prev.map((space) =>
          space.id === activeSpaceId ? { ...space, widgets: updater(space.widgets) } : space,
        ),
      );
    },
    [activeSpaceId, updateDraftLayout],
  );

  const handleReorder = useCallback(
    (next: DashboardWidget[]) => {
      updateActiveSpaceWidgets(() => next);
    },
    [updateActiveSpaceWidgets],
  );

  const handleRequestRemove = useCallback((widget: DashboardWidget) => {
    setPendingRemoval(widget);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    updateActiveSpaceWidgets((currentWidgets) =>
      repackWidgets(currentWidgets.filter((widget) => widget.id !== pendingRemoval.id)),
    );
    setPendingRemoval(null);
  }, [pendingRemoval, updateActiveSpaceWidgets]);

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const meta = WIDGET_META[type];
      const tempId = `pending-${type}-${Date.now()}`;
      updateActiveSpaceWidgets((currentWidgets) =>
        repackWidgets([
          ...currentWidgets,
          {
            id: tempId,
            widget_type: type,
            col_x: 0,
            col_y: Number.POSITIVE_INFINITY,
            col_span: meta.size.defaultColSpan,
            row_span: meta.size.defaultRowSpan,
            config: null,
          } as DashboardWidget,
        ]),
      );
      setIsGalleryOpen(false);
    },
    [updateActiveSpaceWidgets],
  );

  const handleResizeWidget = useCallback(
    (widget: DashboardWidget, action: "narrower" | "wider" | "shorter" | "taller") => {
      updateActiveSpaceWidgets((currentWidgets) => {
        let changed = false;
        const nextWidgets = currentWidgets.map((currentWidget) => {
          if (currentWidget.id !== widget.id) return currentWidget;

          const colDelta = action === "wider" ? 1 : action === "narrower" ? -1 : 0;
          const rowDelta = action === "taller" ? 1 : action === "shorter" ? -1 : 0;
          const nextSize = clampWidgetSize(
            currentWidget.widget_type,
            currentWidget.col_span + colDelta,
            currentWidget.row_span + rowDelta,
          );

          if (
            nextSize.colSpan === currentWidget.col_span &&
            nextSize.rowSpan === currentWidget.row_span
          ) {
            return currentWidget;
          }

          changed = true;
          return {
            ...currentWidget,
            col_span: nextSize.colSpan,
            row_span: nextSize.rowSpan,
          };
        });

        return changed ? repackWidgets(nextWidgets) : currentWidgets;
      });
    },
    [updateActiveSpaceWidgets],
  );

  const handleAddSpace = useCallback(() => {
    const nextId = createPendingSpaceId();
    updateDraftLayout((prev) => [...prev, createDashboardSpace(prev, nextId)]);
    setActiveSpaceIdSynced(nextId);
  }, [setActiveSpaceIdSynced, updateDraftLayout]);

  const handleRenameActiveSpace = useCallback(
    (name: string) => {
      if (!activeSpaceId) return;
      updateDraftLayout((prev) =>
        prev.map((space) =>
          space.id === activeSpaceId
            ? { ...space, name: name.slice(0, SPACE_NAME_MAX_LENGTH) }
            : space,
        ),
      );
    },
    [activeSpaceId, updateDraftLayout],
  );

  const handleSetDefaultSpace = useCallback(() => {
    if (!activeSpaceId) return;
    updateDraftLayout((prev) =>
      prev.map((space) => ({
        ...space,
        is_default: space.id === activeSpaceId,
      })),
    );
  }, [activeSpaceId, updateDraftLayout]);

  const handleConfirmRemoveSpace = useCallback(async () => {
    if (!pendingSpaceRemoval) return;
    const nextSpaces = removeDashboardSpace(draftSpaces, pendingSpaceRemoval.id);
    setDraftSpacesSynced(nextSpaces);
    setIsDirty(true);
    setLayoutSaveError(null);
    setPendingSpaceRemoval(null);
    setActiveSpaceIdSynced(
      nextSpaces.find((space) => space.is_default)?.id ?? nextSpaces[0]?.id ?? null,
    );
  }, [draftSpaces, pendingSpaceRemoval, setActiveSpaceIdSynced, setDraftSpacesSynced]);

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
    onTransactionsPageChange: handleTransactionsPageChange,
    onTransactionsPageSizeChange: handleTransactionsPageSizeChange,
  };

  return (
    <DashboardDataProvider value={dashboardData}>
      <div className="space-y-6 pb-24">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start sm:gap-4">
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

            {!isEditMode && (
              <div className="hidden sm:block">
                <DashboardSpacesBar
                  spaces={draftSpaces}
                  activeSpaceId={activeSpaceId}
                  isEditMode={false}
                  onSelectSpace={setActiveSpaceId}
                  onPrevSpace={() => navigateSpace(-1)}
                  onNextSpace={() => navigateSpace(1)}
                  onRenameActiveSpace={handleRenameActiveSpace}
                  onAddSpace={handleAddSpace}
                  onSetDefaultSpace={handleSetDefaultSpace}
                  onRequestDeleteActiveSpace={() => {
                    if (!activeSpace || draftSpaces.length <= 1) return;
                    setPendingSpaceRemoval(activeSpace);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 sm:hidden">
              <div className="flex min-w-0 items-center justify-center rounded-lg border border-edge-default bg-surface-primary p-0.5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)]">
                <ToolbarButton
                  label="Export data"
                  onClick={() => setIsExportModalOpen(true)}
                  className="h-[30px] w-[30px] rounded-sm border-transparent"
                  icon={
                    <svg
                      className="h-3.5 w-3.5"
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
                      ref={mobileControlsToggleRef}
                      onClick={() => setIsControlsOpen(!isControlsOpen)}
                      className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-sm transition-[background-color,color] duration-200 ${
                        isControlsOpen
                          ? "bg-emerald text-white"
                          : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary"
                      }`}
                      aria-label="Filters & controls"
                    >
                      <svg
                        className="h-3.5 w-3.5"
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
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
                      )}
                    </button>
                  </Tooltip>

                  <ControlsPanel
                    isOpen={isControlsOpen}
                    onClose={() => setIsControlsOpen(false)}
                    toggleRef={mobileControlsToggleRef}
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
                  className="h-[30px] w-[30px] rounded-sm border-transparent text-accent hover:bg-accent-soft-bg"
                  icon={
                    <svg
                      className="h-3.5 w-3.5"
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
                  }
                />
              </div>

              <Tooltip content={isEditMode ? "Done editing" : "Edit dashboard"}>
                <button
                  type="button"
                  aria-label={isEditMode ? "Exit edit mode" : "Edit dashboard"}
                  onClick={handleToggleEditMode}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-[background-color,color,border-color] duration-200 ${
                    isEditMode
                      ? "border-transparent bg-emerald text-white hover:bg-emerald-hover"
                      : "border-edge-strong bg-surface-primary text-content-primary hover:bg-surface-hover"
                  }`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip content="Add an expense">
                <button
                  type="button"
                  aria-label="Add an expense"
                  onClick={handleAdd}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald text-white transition-[background-color] duration-200 hover:bg-emerald-hover"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <div className="flex items-center rounded-lg border border-edge-default bg-surface-primary p-1 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)]">
              <ToolbarButton
                label="Export data"
                onClick={() => setIsExportModalOpen(true)}
                className="border-transparent"
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
                    ref={desktopControlsToggleRef}
                    onClick={() => setIsControlsOpen(!isControlsOpen)}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-[background-color,color] duration-200 ${
                      isControlsOpen
                        ? "bg-emerald text-white"
                        : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary"
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
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
                    )}
                  </button>
                </Tooltip>

                <ControlsPanel
                  isOpen={isControlsOpen}
                  onClose={() => setIsControlsOpen(false)}
                  toggleRef={desktopControlsToggleRef}
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
                className="border-transparent text-accent hover:bg-accent-soft-bg"
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
            </div>

            <Tooltip content={isEditMode ? "Done editing" : "Edit dashboard"}>
              <button
                type="button"
                aria-label={isEditMode ? "Exit edit mode" : "Edit dashboard"}
                onClick={handleToggleEditMode}
                className={`inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-[background-color,color,border-color] duration-200 ${
                  isEditMode
                    ? "border-transparent bg-emerald text-white hover:bg-emerald-hover"
                    : "border-edge-strong bg-surface-primary text-content-primary hover:bg-surface-hover"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>{isEditMode ? "Done editing" : "Edit"}</span>
              </button>
            </Tooltip>

            <Tooltip content="Add an expense">
              <button
                type="button"
                aria-label="Add an expense"
                onClick={handleAdd}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald px-4 text-sm font-medium text-white transition-[background-color] duration-200 hover:bg-emerald-hover"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Add</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ─── Currency info ─── */}
        {!currentCurrency && monthlyStats.is_converted && !isConversionBannerDismissed && (
          <div className="hidden items-center justify-between gap-4 rounded-md border border-accent/20 bg-accent-soft-bg px-4 py-2.5 text-xs text-accent-soft-text sm:flex">
            <div className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
            <button
              type="button"
              aria-label="Dismiss conversion notice"
              onClick={() => {
                setIsConversionBannerDismissed(true);
                window.localStorage.setItem("cofr:hide-conversion-banner", "1");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-accent/15 bg-surface-primary/70 text-accent-soft-text transition-colors hover:bg-surface-primary"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
        )}

        {isEditMode && (
          <div className="hidden sm:block">
            <DashboardSpacesBar
              spaces={draftSpaces}
              activeSpaceId={activeSpaceId}
              isEditMode={isEditMode}
              onSelectSpace={setActiveSpaceId}
              onPrevSpace={() => navigateSpace(-1)}
              onNextSpace={() => navigateSpace(1)}
              onRenameActiveSpace={handleRenameActiveSpace}
              onAddSpace={handleAddSpace}
              onSetDefaultSpace={handleSetDefaultSpace}
              onRequestDeleteActiveSpace={() => {
                if (!activeSpace || draftSpaces.length <= 1) return;
                setPendingSpaceRemoval(activeSpace);
              }}
            />
          </div>
        )}

        {/* ─── Composable widget grid ─── */}
        <DashboardGrid
          widgets={widgets}
          isEditMode={isEditMode}
          onReorder={handleReorder}
          onRequestRemove={handleRequestRemove}
          onResize={handleResizeWidget}
          onOpenGallery={() => setIsGalleryOpen(true)}
        />

        {/* ─── Modals & floating surfaces ─── */}
        <EditModeToolbar
          isEditMode={isEditMode && !isGalleryOpen}
          onExit={handleToggleEditMode}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onSave={() => void persistLayout()}
          onDiscard={handleDiscardLayout}
          isDirty={isDirty}
          isSaving={isSaving}
          error={layoutSaveError}
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
        <DeleteConfirmModal
          isOpen={!!pendingRemoval}
          onClose={() => setPendingRemoval(null)}
          onConfirm={handleConfirmRemove}
          title="Remove widget?"
          message={
            pendingRemoval
              ? `Remove the ${WIDGET_META[pendingRemoval.widget_type].title} widget from your dashboard? You can add it back later from the widget gallery.`
              : undefined
          }
        />
        <DeleteConfirmModal
          isOpen={!!pendingSpaceRemoval}
          onClose={() => setPendingSpaceRemoval(null)}
          onConfirm={handleConfirmRemoveSpace}
          title="Delete space?"
          message={
            pendingSpaceRemoval
              ? `Delete the ${pendingSpaceRemoval.name || "current"} space and all of its widgets?`
              : undefined
          }
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
