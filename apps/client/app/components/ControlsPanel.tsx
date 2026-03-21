import { useCallback, useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";

export type Preset = "thisMonth" | "last7Days" | "lastYear" | "custom";

interface ControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toggleRef?: React.RefObject<HTMLElement | null>;
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
  { value: "thisMonth", label: "This Month" },
  { value: "last7Days", label: "Last Week" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

export default function ControlsPanel({
  isOpen,
  onClose,
  toggleRef,
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
  const isDragging = useRef(false);

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

  // Swipe down to close on mobile — follows finger
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

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (toggleRef?.current?.contains(target)) return;
        onClose();
      }
    };
    // Delay listener so the opening click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose, toggleRef?.current?.contains]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll on mobile only (desktop uses dropdown, not bottom sheet)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  useBodyScrollLock(isOpen && isMobile);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:hidden transition-opacity"
        style={{ opacity: dragOffset > 0 ? Math.max(0, 1 - dragOffset / 200) : 1 }}
        onClick={onClose}
      />

      {/* Wrapper — full-viewport flex on mobile, vanishes on desktop */}
      <div className="fixed inset-0 z-50 flex items-end sm:contents">
        {/* Panel — bottom sheet on mobile, dropdown on desktop */}
        <div
          ref={panelRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="
            w-full max-h-[85dvh] overflow-y-auto overflow-x-hidden overscroll-contain
            sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-80 sm:max-h-[80vh] sm:overflow-y-auto
            bg-surface-primary border border-edge-default rounded-t-2xl sm:rounded-xl
            shadow-xl p-5 pb-8 sm:pb-5
          "
          style={{
            animation: dragOffset === 0 ? "slideUp 0.2s ease-out" : "none",
            transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            transition: isDragging.current ? "none" : "transform 0.2s ease-out",
          }}
        >
          {/* Drag handle — mobile */}
          <div className="flex justify-center sm:hidden -mx-5 -mt-5 pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-edge-strong" />
          </div>

          <div className="space-y-4">
            {/* Period presets */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-2">
                Period
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onPresetChange(p.value)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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
                    className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5"
                  >
                    Start
                  </label>
                  <input
                    id="ctrl-start"
                    type="date"
                    value={customStart}
                    onChange={(e) => onCustomStartChange(e.target.value)}
                    className="w-full min-w-0 h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
                  />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor="ctrl-end"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5"
                  >
                    End
                  </label>
                  <input
                    id="ctrl-end"
                    type="date"
                    value={customEnd}
                    onChange={(e) => onCustomEndChange(e.target.value)}
                    className="w-full min-w-0 h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
                  />
                </div>
              </div>
            )}

            {/* Currency & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ctrl-currency"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5"
                >
                  Currency
                </label>
                <select
                  id="ctrl-currency"
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs font-medium bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
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
                  className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5"
                >
                  Category
                </label>
                <select
                  id="ctrl-category"
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs font-medium bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
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
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5">
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
                  className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40 tabular-nums"
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
                  className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40 tabular-nums"
                />
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="w-full text-xs text-negative-text hover:text-negative-text-strong font-medium py-1.5 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </>
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

  // lastYear: "Mar 25–26"
  if (preset === "lastYear") {
    return `${MONTHS_SHORT[sMonth]} ${String(sYear).slice(2)}–${String(eYear).slice(2)}`;
  }

  // last7Days + custom: smart compression
  const sameMonth = sameYear && sMonth === eMonth;
  const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

  if (sameMonth) {
    // "14–21 Mar" or "14–21 Mar '25"
    const suffix = isCurrentYear ? "" : ` ${shortYear(sYear)}`;
    return `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[sMonth]}${suffix}`;
  }
  if (sameYear) {
    // "28 Feb – 7 Mar" or "28 Feb – 7 Mar '25"
    const suffix = isCurrentYear ? "" : ` ${shortYear(sYear)}`;
    return `${dayMonth(s)} – ${dayMonth(e)}${suffix}`;
  }
  // Cross year: drop days, month + 'YY both sides — "Jan '25 – Mar '26"
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
