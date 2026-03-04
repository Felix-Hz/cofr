import { useEffect, useRef } from "react";

export type Preset = "thisMonth" | "lastMonth" | "thisWeek" | "last7Days" | "last30Days" | "custom";

interface ControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  currencies: string[];
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisWeek", label: "This Week" },
  { value: "last7Days", label: "Last 7 Days" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

export default function ControlsPanel({
  isOpen,
  onClose,
  preset,
  onPresetChange,
  currency,
  onCurrencyChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  currencies,
}: ControlsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay listener so the opening click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={onClose} />

      {/* Wrapper — full-viewport flex on mobile, vanishes on desktop */}
      <div className="fixed inset-0 z-50 flex items-end sm:contents">
        {/* Panel — bottom sheet on mobile, dropdown on desktop */}
        <div
          ref={panelRef}
          className="
            w-full max-h-[85dvh] overflow-y-auto
            sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-80 sm:max-h-none sm:overflow-visible
            bg-surface-primary border border-edge-default rounded-t-2xl sm:rounded-xl
            shadow-xl p-5 pb-8 sm:pb-5
          "
          style={{ animation: "slideUp 0.2s ease-out" }}
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
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
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
                <div>
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
                    className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
                  />
                </div>
                <div>
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
                    className="w-full h-9 px-2.5 border border-edge-strong rounded-lg text-xs bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
                  />
                </div>
              </div>
            )}

            {/* Currency */}
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
                <option value="">All Currencies</option>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "thisWeek": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "last7Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { startDate: toISODate(start), endDate: toISODate(now) };
    }
    case "last30Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
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

  if (preset === "custom" && startDate && endDate) {
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3)}`;
    if (s.getFullYear() !== e.getFullYear()) {
      return `${fmt(s)} ${s.getFullYear()} – ${fmt(e)} ${e.getFullYear()}`;
    }
    return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
  }

  if (startDate) {
    const s = new Date(startDate + "T00:00:00");
    switch (preset) {
      case "thisMonth":
      case "lastMonth":
        return `${MONTHS_FULL[s.getMonth()]} ${s.getFullYear()}`;
      case "thisWeek":
      case "last7Days":
      case "last30Days": {
        const e = new Date(endDate + "T00:00:00");
        const fmt = (d: Date) => `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3)}`;
        return `${fmt(s)} – ${fmt(e)}`;
      }
    }
  }

  return "Select period";
}

/** Navigate a preset forward/backward by one period */
export function shiftPreset(
  preset: Preset,
  startDate: string,
  direction: 1 | -1,
): { startDate: string; endDate: string } {
  const s = new Date(startDate + "T00:00:00");

  switch (preset) {
    case "thisMonth":
    case "lastMonth": {
      s.setMonth(s.getMonth() + direction);
      const end = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    case "thisWeek": {
      s.setDate(s.getDate() + 7 * direction);
      const end = new Date(s);
      end.setDate(s.getDate() + 6);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    case "last7Days": {
      s.setDate(s.getDate() + 7 * direction);
      const end = new Date(s);
      end.setDate(s.getDate() + 6);
      return { startDate: toISODate(s), endDate: toISODate(end) };
    }
    case "last30Days": {
      s.setDate(s.getDate() + 30 * direction);
      const end = new Date(s);
      end.setDate(s.getDate() + 29);
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
