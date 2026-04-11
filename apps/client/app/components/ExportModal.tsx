import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import {
  createExport,
  getExportDownloadUrl,
  getExportHistory,
  getExportRecordDownloadUrl,
  getExportStreamUrl,
} from "~/lib/api";
import type { ExportCreate, ExportRecord } from "~/lib/schemas";
import { truncateText } from "~/lib/utils";

type ExportFormat = "csv" | "xlsx" | "pdf";
type ExportScope = "transactions" | "accounts" | "categories" | "full_dump";
type ExportStatus = "idle" | "pending" | "querying" | "rendering" | "done" | "error";
const EXPORT_NAME_INPUT_MAX = 60;
const EXPORT_NAME_DISPLAY_MAX = 32;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportComplete?: () => void;
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
  { value: "csv", label: "CSV", description: "Spreadsheet" },
  { value: "xlsx", label: "XLSX", description: "Excel workbook" },
  { value: "pdf", label: "PDF", description: "Report" },
];

const SCOPE_OPTIONS: { value: ExportScope; label: string; description: string }[] = [
  { value: "transactions", label: "Transactions", description: "Your transaction history" },
  { value: "accounts", label: "Accounts", description: "Account summaries and balances" },
  { value: "categories", label: "Categories", description: "Category breakdown with totals" },
  { value: "full_dump", label: "Full Backup", description: "All data for backup or migration" },
];

const SCOPE_LABELS: Record<ExportScope, string> = {
  transactions: "Transactions",
  accounts: "Accounts",
  categories: "Categories",
  full_dump: "Full Backup",
};

const STATUS_LABELS: Record<ExportStatus, string> = {
  idle: "",
  pending: "Preparing export...",
  querying: "Fetching your data...",
  rendering: "Generating file...",
  done: "Export complete!",
  error: "Export failed",
};

function generateDefaultName(scope: ExportScope, _format: ExportFormat): string {
  const label = SCOPE_LABELS[scope];
  const month = new Date().toLocaleDateString("en", { month: "short", year: "numeric" });
  return `${label} - ${month}`;
}

function getExportExtension(format: ExportFormat, scope: ExportScope): string {
  if (format === "csv" && scope === "full_dump") return "zip";
  return format;
}

function sanitizeFilenameStem(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .split("")
    .filter((char) => char.charCodeAt(0) <= 0x7f)
    .join("")
    .trim();
  const sanitized = normalized
    .replace(/[^A-Za-z0-9._ -]+/g, "-")
    .replace(/[- ]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return sanitized || "export";
}

export default function ExportModal({
  isOpen,
  onClose,
  onExportComplete,
  transactionCount,
  defaultFilters,
  defaultScope = "transactions",
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [recentExports, setRecentExports] = useState<ExportRecord[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useBodyScrollLock(isOpen);

  const autoName = useMemo(() => generateDefaultName(scope, format), [scope, format]);
  const effectiveName = name.trim() || autoName;
  const filenamePreview = `${sanitizeFilenameStem(effectiveName)}.${getExportExtension(format, scope)}`;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormat("csv");
      setScope(defaultScope);
      setName("");
      setNameEdited(false);
      setStatus("idle");
      setError(null);
      setJobId(null);
      setShowRecent(false);
      // Fetch recent exports
      getExportHistory(3, 0)
        .then((res) => setRecentExports(res.exports))
        .catch(() => setRecentExports([]));
    }
    return () => {
      void readerRef.current?.cancel();
      readerRef.current = null;
    };
  }, [isOpen, defaultScope]);

  const isExporting = status !== "idle" && status !== "done" && status !== "error";
  const hasNoTransactions = scope === "transactions" && transactionCount === 0;
  const canConfirm = !isExporting && !hasNoTransactions;

  useEffect(() => {
    if (!isOpen || isExporting || status === "idle") return;

    setStatus("idle");
    setError(null);
    setJobId(null);
  }, [isOpen, isExporting, status]);

  useEffect(() => {
    if (scope === "full_dump" && format === "pdf") {
      setFormat("csv");
    }
  }, [scope, format]);

  const handleExport = useCallback(async () => {
    setStatus("pending");
    setError(null);

    try {
      const exportName = nameEdited && name.trim() ? name.trim() : undefined;
      const data: ExportCreate = {
        format,
        scope,
        name: exportName,
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
      const response = await fetch(streamUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to export stream");
      }

      await readerRef.current?.cancel();
      const reader = response.body.getReader();
      readerRef.current = reader;
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
                const downloadUrl = getExportDownloadUrl(job.job_id);
                window.open(downloadUrl, "_blank");
                await reader.cancel();
                readerRef.current = null;
                // Refresh recent exports
                getExportHistory(3, 0)
                  .then((res) => {
                    setRecentExports(res.exports);
                  })
                  .catch(() => {})
                  .finally(() => {
                    onExportComplete?.();
                  });
                return;
              }
              if (event.status === "error") {
                await reader.cancel();
                readerRef.current = null;
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
    } finally {
      readerRef.current = null;
    }
  }, [format, scope, name, nameEdited, defaultFilters, onExportComplete]);

  useModalKeyboardShortcuts({
    isOpen,
    onEscape: onClose,
    onEnter:
      status === "done" && jobId
        ? () => {
            const url = getExportDownloadUrl(jobId);
            window.open(url, "_blank");
          }
        : canConfirm
          ? () => void handleExport()
          : undefined,
    disableEscape: isExporting,
    disableEnter: !canConfirm && !(status === "done" && !!jobId),
    allowEnterFromEditable: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={isExporting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-surface-primary rounded-xl border border-edge-default shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-default shrink-0">
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
        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              Export name
            </label>
            <p className="mb-1.5 text-xs text-content-tertiary">
              Optional. Used for saved exports and the download filename.
            </p>
            <input
              type="text"
              maxLength={EXPORT_NAME_INPUT_MAX}
              value={name}
              onChange={(e) => {
                const nextValue = e.target.value;
                setName(nextValue);
                setNameEdited(nextValue.trim().length > 0);
              }}
              disabled={isExporting}
              placeholder={autoName}
              className="w-full px-3 py-2 text-sm rounded-lg border border-edge-default bg-surface-primary text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-emerald disabled:opacity-50"
            />
            <p
              className="mt-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-content-tertiary/65"
              title={filenamePreview}
            >
              {filenamePreview}
            </p>
          </div>

          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">Format</label>
            <div className="rounded-xl border border-edge-default bg-surface-elevated p-1">
              <div className="grid grid-cols-3 gap-1">
                {FORMAT_OPTIONS.map((opt) => {
                  const disabledForScope = opt.value === "pdf" && scope === "full_dump";
                  const selected = format === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isExporting || disabledForScope}
                      onClick={() => setFormat(opt.value)}
                      className={`rounded-lg px-3 py-2 text-left transition-colors ${
                        selected
                          ? "bg-emerald text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : disabledForScope
                            ? "text-content-tertiary/50 cursor-not-allowed"
                            : "text-content-secondary hover:bg-surface-hover"
                      } disabled:opacity-100`}
                      aria-pressed={selected}
                      aria-disabled={disabledForScope}
                    >
                      <span className="block text-sm font-semibold leading-none">{opt.label}</span>
                      <span
                        className={`mt-1 block text-[11px] leading-none ${
                          selected
                            ? "text-white/70"
                            : disabledForScope
                              ? "text-content-tertiary/45"
                              : "text-content-tertiary"
                        }`}
                      >
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {scope === "full_dump" ? (
              <p className="mt-1.5 text-xs text-content-tertiary">
                PDF is unavailable for full backups.
              </p>
            ) : null}
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

          {/* Recent exports */}
          {recentExports.length > 0 && (
            <div className="border-t border-edge-default pt-3">
              <button
                type="button"
                onClick={() => setShowRecent(!showRecent)}
                className="w-full flex items-center justify-between text-xs font-medium text-content-secondary uppercase tracking-wide mb-2"
              >
                <span>Recent Exports</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showRecent ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRecent && (
                <div className="space-y-1.5">
                  {recentExports.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated text-sm"
                    >
                      <div className="min-w-0 mr-2">
                        <span className="text-content-primary truncate block" title={rec.name}>
                          {truncateText(rec.name, EXPORT_NAME_DISPLAY_MAX)}
                        </span>
                        <span className="text-xs text-content-tertiary">
                          {rec.format.toUpperCase()} - {formatBytes(rec.file_size)} -{" "}
                          {new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={getExportRecordDownloadUrl(rec.id)}
                        className="text-emerald hover:text-emerald-hover shrink-0 p-1"
                        title="Download"
                        aria-label={`Download export ${rec.name}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </a>
                    </div>
                  ))}
                  <p className="text-xs text-content-tertiary pt-1">
                    Exports are stored for 6 months. View full history in{" "}
                    <a href="/settings#export" className="text-emerald hover:underline">
                      Settings
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-edge-default shrink-0">
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
              disabled={isExporting || hasNoTransactions}
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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
