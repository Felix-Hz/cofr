import { useCallback, useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { createExport, getExportDownloadUrl, getExportStreamUrl } from "~/lib/api";
import type { ExportCreate } from "~/lib/schemas";

type ExportFormat = "csv" | "xlsx" | "pdf";
type ExportScope = "transactions" | "accounts" | "categories" | "full_dump";
type ExportStatus = "idle" | "pending" | "querying" | "rendering" | "done" | "error";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionCount?: number;
  defaultFilters?: {
    startDate?: string;
    endDate?: string;
    accountId?: string;
    categoryId?: string;
    currency?: string;
  };
  defaultScope?: ExportScope;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv", label: "CSV", description: "Spreadsheet-compatible" },
  { value: "xlsx", label: "XLSX", description: "Native Excel format" },
  { value: "pdf", label: "PDF", description: "Formatted report" },
];

const SCOPE_OPTIONS: { value: ExportScope; label: string; description: string }[] = [
  { value: "transactions", label: "Transactions", description: "Your transaction history" },
  { value: "accounts", label: "Accounts", description: "Account summaries and balances" },
  { value: "categories", label: "Categories", description: "Category breakdown with totals" },
  { value: "full_dump", label: "Full Backup", description: "All data for backup or migration" },
];

const STATUS_LABELS: Record<ExportStatus, string> = {
  idle: "",
  pending: "Preparing export...",
  querying: "Fetching your data...",
  rendering: "Generating file...",
  done: "Export complete!",
  error: "Export failed",
};

export default function ExportModal({
  isOpen,
  onClose,
  transactionCount,
  defaultFilters,
  defaultScope = "transactions",
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useBodyScrollLock(isOpen);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormat("csv");
      setScope(defaultScope);
      setStatus("idle");
      setError(null);
      setJobId(null);
    }
    return () => {
      eventSourceRef.current?.close();
    };
  }, [isOpen, defaultScope]);

  const isPdfFullDump = format === "pdf" && scope === "full_dump";
  const isExporting = status !== "idle" && status !== "done" && status !== "error";
  const hasNoTransactions = scope === "transactions" && transactionCount === 0;

  useEffect(() => {
    if (!isOpen || isExporting || status === "idle") return;

    setStatus("idle");
    setError(null);
    setJobId(null);
  }, [format, scope, isOpen, isExporting, status]);

  const handleExport = useCallback(async () => {
    setStatus("pending");
    setError(null);

    try {
      const data: ExportCreate = {
        format,
        scope,
        start_date: defaultFilters?.startDate ? new Date(defaultFilters.startDate) : undefined,
        end_date: defaultFilters?.endDate ? new Date(defaultFilters.endDate) : undefined,
        account_id: defaultFilters?.accountId,
        category_id: defaultFilters?.categoryId,
        currency: defaultFilters?.currency,
      };

      const job = await createExport(data);
      setJobId(job.job_id);

      // Connect to SSE stream
      const streamUrl = getExportStreamUrl(job.job_id);
      const token = localStorage.getItem("cofr_token");
      // EventSource doesn't support custom headers, so we use fetch-based SSE
      const response = await fetch(streamUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to export stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              setStatus(event.status as ExportStatus);
              if (event.error) setError(event.error);

              if (event.status === "done") {
                // Auto-trigger download
                const downloadUrl = getExportDownloadUrl(job.job_id);
                window.open(downloadUrl, "_blank");
                reader.cancel();
                return;
              }
              if (event.status === "error") {
                reader.cancel();
                return;
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }, [format, scope, defaultFilters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={isExporting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-primary rounded-xl border border-edge-default shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-default">
          <h2 className="text-lg font-semibold text-content-heading">Export Data</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-md text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setFormat(opt.value)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    format === opt.value
                      ? "border-emerald bg-accent-soft-bg text-accent-soft-text"
                      : "border-edge-default text-content-secondary hover:bg-surface-hover"
                  } disabled:opacity-50`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">
              Data to export
            </label>
            <div className="space-y-1.5">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setScope(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    scope === opt.value
                      ? "border-emerald bg-accent-soft-bg"
                      : "border-edge-default hover:bg-surface-hover"
                  } disabled:opacity-50`}
                >
                  <div className="text-left">
                    <span
                      className={`font-medium ${scope === opt.value ? "text-accent-soft-text" : "text-content-primary"}`}
                    >
                      {opt.label}
                    </span>
                    <span className="block text-xs text-content-tertiary">{opt.description}</span>
                  </div>
                  {scope === opt.value && (
                    <svg
                      className="w-4 h-4 text-emerald shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* PDF full dump warning */}
          {isPdfFullDump && (
            <div className="px-3 py-2 rounded-lg bg-warning-bg border border-warning-border text-warning-text text-sm">
              PDF format is not available for full backups. Please select CSV or Excel.
            </div>
          )}

          {hasNoTransactions && (
            <div className="px-3 py-2 rounded-lg bg-warning-bg border border-warning-border text-warning-text text-sm">
              No transactions match the current filters. Adjust the filters before exporting.
            </div>
          )}

          {/* Filter summary (when filters are pre-filled) */}
          {defaultFilters &&
            (defaultFilters.startDate || defaultFilters.currency) &&
            scope === "transactions" && (
              <div className="px-3 py-2 rounded-lg bg-surface-elevated text-sm text-content-secondary">
                <span className="font-medium text-content-primary">Filters applied: </span>
                {defaultFilters.startDate && defaultFilters.endDate && (
                  <span>
                    {new Date(defaultFilters.startDate).toLocaleDateString()} -{" "}
                    {new Date(defaultFilters.endDate).toLocaleDateString()}
                  </span>
                )}
                {defaultFilters.currency && <span> - {defaultFilters.currency}</span>}
              </div>
            )}

          {/* Progress indicator */}
          {status !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isExporting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald border-t-transparent" />
                )}
                {status === "done" && (
                  <svg className="w-4 h-4 text-emerald" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {status === "error" && (
                  <svg
                    className="w-4 h-4 text-negative-text"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${
                    status === "done"
                      ? "text-emerald"
                      : status === "error"
                        ? "text-negative-text"
                        : "text-content-secondary"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              {/* Progress bar */}
              {isExporting && (
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald rounded-full transition-all duration-500"
                    style={{
                      width:
                        status === "pending"
                          ? "15%"
                          : status === "querying"
                            ? "45%"
                            : status === "rendering"
                              ? "80%"
                              : "100%",
                    }}
                  />
                </div>
              )}

              {error && <p className="text-sm text-negative-text">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-edge-default">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
          >
            {status === "done" ? "Close" : "Cancel"}
          </button>
          {status !== "done" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isPdfFullDump || hasNoTransactions}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md transition-colors disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>
          )}
          {status === "done" && jobId && (
            <button
              type="button"
              onClick={() => {
                const url = getExportDownloadUrl(jobId);
                window.open(url, "_blank");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md transition-colors"
            >
              Download Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
