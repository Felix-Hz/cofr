import { useCallback, useEffect, useState } from "react";
import { deleteExportRecord, getExportHistory, getExportRecordDownloadUrl } from "~/lib/api";
import type { ExportRecord } from "~/lib/schemas";
import { truncateText } from "~/lib/utils";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const EXPORT_NAME_DISPLAY_MAX = 40;

const SCOPE_LABELS: Record<string, string> = {
  transactions: "Transactions",
  accounts: "Accounts",
  categories: "Categories",
  full_dump: "Full Backup",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function expiresIn(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expiring soon";
  if (days < 30) return `Expires in ${days}d`;
  const months = Math.round(days / 30);
  return `Expires in ${months}mo`;
}

interface ExportHistoryTableProps {
  refreshToken?: number;
}

export default function ExportHistoryTable({ refreshToken = 0 }: ExportHistoryTableProps) {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchExports = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const data = await getExportHistory(pageSize, pageNum * pageSize);
        setExports(data.exports);
        setTotalCount(data.total_count);
        setDeleteError(null);
      } catch {
        setExports([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    fetchExports(page);
  }, [page, fetchExports]);

  useEffect(() => {
    if (refreshToken === 0) return;
    fetchExports(page);
  }, [refreshToken, page, fetchExports]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteExportRecord(id);
      setConfirmDeleteId(null);
      // If we deleted the last item on a page, go back
      if (exports.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        await fetchExports(page);
      }
    } catch {
      setConfirmDeleteId(null);
      setDeleteError("Failed to delete export. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (loading && exports.length === 0) {
    return <div className="mt-4 text-sm text-content-tertiary">Loading export history...</div>;
  }

  if (totalCount === 0) {
    return (
      <div className="mt-4 text-sm text-content-tertiary">
        No saved exports yet. Use the button above to export your data.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-content-secondary py-2"
      >
        <span>Export history ({totalCount})</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2">
          {deleteError ? (
            <div className="mb-3 text-sm text-negative-text" role="alert">
              {deleteError}
            </div>
          ) : null}
          {/* Mobile-first: card layout on small screens, table on md+ */}
          <div className="space-y-2 md:hidden">
            {exports.map((rec) => (
              <div
                key={rec.id}
                className="px-3 py-2.5 rounded-lg border border-edge-default bg-surface-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium text-content-primary truncate"
                      title={rec.name}
                    >
                      {truncateText(rec.name, EXPORT_NAME_DISPLAY_MAX)}
                    </p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      {rec.format.toUpperCase()} - {SCOPE_LABELS[rec.scope] || rec.scope} -{" "}
                      {formatBytes(rec.file_size)}
                    </p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      {formatDate(new Date(rec.created_at))} - {expiresIn(new Date(rec.expires_at))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={getExportRecordDownloadUrl(rec.id)}
                      className="p-1.5 text-emerald hover:text-emerald-hover rounded-md hover:bg-surface-hover transition-colors"
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
                    {confirmDeleteId === rec.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          disabled={deletingId === rec.id}
                          className="text-xs text-negative-text hover:underline disabled:opacity-50"
                        >
                          {deletingId === rec.id ? "..." : "Yes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-content-tertiary hover:underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rec.id)}
                        className="p-1.5 text-negative-text/60 hover:text-negative-text rounded-md hover:bg-surface-hover transition-colors"
                        title="Delete"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-content-tertiary uppercase tracking-wide border-b border-edge-default">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Format</th>
                  <th className="pb-2 pr-4 font-medium">Scope</th>
                  <th className="pb-2 pr-4 font-medium">Size</th>
                  <th className="pb-2 pr-4 font-medium">Created</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-default">
                {exports.map((rec) => (
                  <tr key={rec.id} className="group">
                    <td className="py-2.5 pr-4">
                      <span
                        className="text-content-primary truncate block max-w-[200px]"
                        title={rec.name}
                      >
                        {truncateText(rec.name, EXPORT_NAME_DISPLAY_MAX)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-content-secondary">
                      {rec.format.toUpperCase()}
                    </td>
                    <td className="py-2.5 pr-4 text-content-secondary">
                      {SCOPE_LABELS[rec.scope] || rec.scope}
                    </td>
                    <td className="py-2.5 pr-4 text-content-secondary">
                      {formatBytes(rec.file_size)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-content-secondary">
                        {formatDate(new Date(rec.created_at))}
                      </span>
                      <span className="block text-xs text-content-tertiary">
                        {expiresIn(new Date(rec.expires_at))}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={getExportRecordDownloadUrl(rec.id)}
                          className="p-1.5 text-emerald hover:text-emerald-hover rounded-md hover:bg-surface-hover transition-colors"
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
                        {confirmDeleteId === rec.id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => handleDelete(rec.id)}
                              disabled={deletingId === rec.id}
                              className="text-negative-text hover:underline disabled:opacity-50"
                            >
                              {deletingId === rec.id ? "..." : "Confirm"}
                            </button>
                            <span className="text-content-tertiary">/</span>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-content-tertiary hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(rec.id)}
                            className="p-1.5 text-negative-text/60 hover:text-negative-text rounded-md hover:bg-surface-hover transition-colors"
                            title="Delete"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(totalPages > 1 || totalCount > pageSize) && (
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-edge-default">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-content-tertiary">
                  Page {page + 1} of {totalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="h-7 px-1.5 border border-edge-strong rounded-md text-xs text-content-tertiary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-emerald/40 transition-shadow"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          <p className="text-xs text-content-tertiary mt-3">
            Exports are automatically deleted after 6 months. You can recreate them anytime using
            the export filters.
          </p>
        </div>
      )}
    </div>
  );
}
