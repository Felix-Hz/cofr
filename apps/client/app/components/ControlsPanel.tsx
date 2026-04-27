import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";

export type Preset = "thisMonth" | "last7Days" | "lastYear" | "custom";

interface ControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRefs?: Array<React.RefObject<HTMLElement | null>>;
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  currencies: string[];
  categories: { id: string; name: string }[];
  category: string;
  onCategoryChange: (value: string) => void;
  minAmount: string;
  onMinAmountChange: (value: string) => void;
  maxAmount: string;
  onMaxAmountChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "thisMonth", label: "Current Month" },
  { value: "last7Days", label: "Past Week" },
  { value: "lastYear", label: "Past Year" },
  { value: "custom", label: "Custom Range" },
];

export default function ControlsPanel({
  isOpen,
  onClose,
  anchorRefs = [],
  preset,
  onPresetChange,
  currency,
  onCurrencyChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  currencies,
  categories,
  category,
  onCategoryChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
  hasActiveFilters,
  onClearFilters,
}: ControlsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const isDragging = useRef(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Local state for amount inputs (navigate only on blur)
  const [localMin, setLocalMin] = useState(minAmount);
  const [localMax, setLocalMax] = useState(maxAmount);

  // Sync local state when props change (e.g. URL navigation)
  useEffect(() => setLocalMin(minAmount), [minAmount]);
  useEffect(() => setLocalMax(maxAmount), [maxAmount]);

  // Reset drag state when panel closes
  useEffect(() => {
    if (!isOpen) setDragOffset(0);
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRefs.some((ref) => ref.current?.contains(target))) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorRefs, isMobile, isOpen, onClose]);

  // Swipe down to close on mobile, follows the finger
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = panelRef.current;
    // Only start drag if panel is scrolled to top
    if (el && el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    if (dragOffset > 100) {
      onClose();
    }
    setDragOffset(0);
    touchStartY.current = null;
    isDragging.current = false;
  }, [dragOffset, onClose]);

  // Non-passive touchmove so we can preventDefault during drag (suppresses scroll bounce)
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !isOpen) return;
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        e.preventDefault();
        isDragging.current = true;
        setDragOffset(delta);
      } else {
        setDragOffset(0);
      }
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen && isMobile);

  if (!isOpen) return null;

  const panel = (
    <div
      ref={panelRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={
        isMobile
          ? `
            w-full max-h-[88dvh] overflow-y-auto overflow-x-hidden overscroll-contain
            rounded-t-2xl border border-edge-default bg-surface-primary p-5 pb-8 shadow-xl
          `
          : `
            absolute right-0 top-full z-50 mt-2 w-80 max-h-[80vh] overflow-y-auto overflow-x-hidden
            rounded-xl border border-edge-default bg-surface-primary p-5 shadow-xl
          `
      }
      style={
        isMobile
          ? {
              animation: dragOffset === 0 ? "slideUp 0.2s ease-out" : "none",
              transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
              transition: isDragging.current ? "none" : "transform 0.2s ease-out",
            }
          : undefined
      }
    >
      {/* Drag handle (mobile) */}
      <div className="flex justify-center sm:hidden -mx-5 -mt-5 pt-3 pb-1">
        <div className="h-1 w-10 rounded-full bg-edge-strong" />
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-edge-default pb-4 sm:hidden">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
              Filters
            </div>
            <p className="mt-1 text-sm text-content-secondary">
              Refine the dashboard without leaving this view.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-edge-default bg-surface-elevated text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
            aria-label="Close filters"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Period presets */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
            Period
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onPresetChange(p.value)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.value
                    ? "bg-emerald text-white"
                    : "bg-surface-elevated text-content-secondary hover:bg-surface-hover"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range inputs */}
        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label
                htmlFor="ctrl-start"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
              >
                Start
              </label>
              <input
                id="ctrl-start"
                type="date"
                value={customStart}
                onChange={(e) => {
                  const v = e.target.value;
                  if (customEnd && v > customEnd) {
                    onCustomEndChange(v);
                    onCustomStartChange(customEnd);
                  } else {
                    onCustomStartChange(v);
                  }
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="ctrl-end"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
              >
                End
              </label>
              <input
                id="ctrl-end"
                type="date"
                value={customEnd}
                onChange={(e) => {
                  const v = e.target.value;
                  if (customStart && v < customStart) {
                    onCustomStartChange(v);
                    onCustomEndChange(customStart);
                  } else {
                    onCustomEndChange(v);
                  }
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
              />
            </div>
          </div>
        )}

        {/* Currency & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="ctrl-currency"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
            >
              Currency
            </label>
            <select
              id="ctrl-currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
            >
              <option value="">All</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="ctrl-category"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
            >
              Category
            </label>
            <select
              id="ctrl-category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount range */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
            Amount Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              onBlur={() => {
                if (localMin !== minAmount) onMinAmountChange(localMin);
              }}
              min="0"
              step="0.01"
              className="h-9 w-full rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs tabular-nums text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
            />
            <input
              type="number"
              placeholder="Max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              onBlur={() => {
                if (localMax !== maxAmount) onMaxAmountChange(localMax);
              }}
              min="0"
              step="0.01"
              className="h-9 w-full rounded-lg border border-edge-strong bg-surface-primary px-2.5 text-xs tabular-nums text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
            />
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="w-full py-1.5 text-xs font-medium text-negative-text transition-colors hover:text-negative-text-strong"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );

  if (!isMobile) {
    return panel;
  }

  if (!portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end overflow-hidden"
      style={{
        backgroundColor: `rgba(0,0,0,${dragOffset > 0 ? Math.max(0, 0.4 * (1 - dragOffset / 200)) : 0.4})`,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {panel}
    </div>,
    portalTarget,
  );
}

/** Compute start/end dates for a preset */
export function getPresetDates(
  preset: Preset,
  referenceDate?: Date,
): { startDate: string; endDate: string } {
  const now = referenceDate ?? new Date();

  switch (preset) {
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "last7Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { startDate: toISODate(start), endDate: toISODate(now) };
    }
    case "lastYear": {
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      start.setDate(start.getDate() - 1);
      return { startDate: toISODate(start), endDate: toISODate(now) };
    }
    case "custom":
      // Custom dates are provided externally
      return { startDate: "", endDate: "" };
  }
}

/** Get display label for the current period */
export function getPresetLabel(preset: Preset, startDate: string, endDate: string): string {
  const MONTHS_FULL = [
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
  const MONTHS_SHORT = MONTHS_FULL.map((m) => m.slice(0, 3));
  const currentYear = new Date().getFullYear();
  const shortYear = (y: number) => `'${String(y).slice(2)}`;

  if (!startDate) return "Select period";

  const s = new Date(startDate + "T00:00:00");

  if (preset === "thisMonth") {
    return `${MONTHS_FULL[s.getMonth()]} ${s.getFullYear()}`;
  }

  if (!endDate) return "Select period";

  const e = new Date(endDate + "T00:00:00");
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();
  const sMonth = s.getMonth();
  const eMonth = e.getMonth();
  const sameYear = sYear === eYear;
  const isCurrentYear = sameYear && sYear === currentYear;

  // lastYear: "Mar '25–'26" (apostrophes make years unambiguous)
  if (preset === "lastYear") {
    return `${MONTHS_SHORT[sMonth]} '${String(sYear).slice(2)}–'${String(eYear).slice(2)}`;
  }

  // last7Days + custom: smart compression
  const sameMonth = sameYear && sMonth === eMonth;
  const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

  if (sameMonth) {
    // "Apr 14–21" or "Apr 14–21 '25" (month first avoids year confusion)
    const suffix = isCurrentYear ? "" : ` ${shortYear(sYear)}`;
    return `${MONTHS_SHORT[sMonth]} ${s.getDate()}–${e.getDate()}${suffix}`;
  }
  if (sameYear) {
    // "28 Feb – 7 Mar" or "28 Feb – 7 Mar '25"
    const suffix = isCurrentYear ? "" : ` ${shortYear(sYear)}`;
    return `${dayMonth(s)} – ${dayMonth(e)}${suffix}`;
  }
  // Cross year: drop days, month + 'YY on both sides, e.g. "Jan '25 – Mar '26"
  return `${MONTHS_SHORT[sMonth]} ${shortYear(sYear)} – ${MONTHS_SHORT[eMonth]} ${shortYear(eYear)}`;
}

/** Navigate a preset forward/backward by one period */
export function shiftPreset(
  preset: Preset,
  startDate: string,
  direction: 1 | -1,
): { startDate: string; endDate: string } {
  const s = new Date(startDate + "T00:00:00");

  switch (preset) {
    case "thisMonth": {
      s.setMonth(s.getMonth() + direction);
      const end = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    case "last7Days": {
      s.setDate(s.getDate() + 8 * direction);
      const end = new Date(s);
      end.setDate(s.getDate() + 7);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    case "lastYear": {
      s.setFullYear(s.getFullYear() + direction);
      const end = new Date(s);
      end.setFullYear(s.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    default:
      return { startDate, endDate: startDate };
  }
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
