import { useEffect, useState } from "react";
import { getExchangeRates } from "~/lib/api";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";

interface ExchangeRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredCurrency: string;
}

export default function ExchangeRatesModal({
  isOpen,
  onClose,
  preferredCurrency,
}: ExchangeRatesModalProps) {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getExchangeRates()
      .then((data) => {
        setRates(data.rates);
        setUpdatedAt(data.updated_at);
      })
      .catch(() => {
        setRates(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Convert USD-based rates to preferred currency-based rates
  const convertedRates: { code: string; rate: number }[] = [];
  if (rates) {
    const baseRate = rates[preferredCurrency] ?? 1;
    for (const code of SUPPORTED_CURRENCIES) {
      if (code === preferredCurrency) continue;
      const usdRate = rates[code];
      if (usdRate != null) {
        convertedRates.push({ code, rate: usdRate / baseRate });
      }
    }
  }

  function formatUpdatedAt(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Updated just now";
    if (mins < 60) return `Updated ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Updated ${hours}h ago`;
    return `Updated ${new Date(iso).toLocaleDateString()}`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-semibold text-content-primary">Exchange Rates</h3>
              <div className="relative group">
                <svg
                  className="w-4 h-4 text-content-tertiary cursor-help"
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
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity delay-200 absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-content-heading bg-surface-elevated border border-edge-strong rounded-lg shadow-lg z-50 w-52 pointer-events-none">
                  Rates are based on your default currency ({preferredCurrency}). Go to Settings
                  &gt; Preferences to change it.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-content-tertiary hover:text-content-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-xs text-content-tertiary mb-4">Base: {preferredCurrency}</p>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : rates ? (
            <>
              <div className="rounded-lg overflow-hidden border border-border-primary">
                {convertedRates.map(({ code, rate }, i) => (
                  <div
                    key={code}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      i % 2 === 0 ? "bg-surface-elevated" : ""
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-content-primary">
                      {code}
                    </span>
                    <span className="tabular-nums text-sm text-content-primary">
                      {rate.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-0.5">
                {updatedAt && (
                  <p className="text-[11px] text-content-tertiary">{formatUpdatedAt(updatedAt)}</p>
                )}
                <p className="text-[11px] text-content-tertiary">Source: frankfurter.app</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-content-secondary py-4 text-center">
              Failed to load exchange rates.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
