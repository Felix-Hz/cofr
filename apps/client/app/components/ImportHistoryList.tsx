import { useEffect, useState } from "react";
import { getImportHistory, undoImport } from "~/lib/api";
import type { ImportBatch } from "~/lib/schemas";

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ImportHistoryList({
  refreshToken,
  onChanged,
}: {
  refreshToken: number;
  onChanged?: () => void;
}) {
  const [batches, setBatches] = useState<ImportBatch[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshToken is the reload trigger
  useEffect(() => {
    getImportHistory()
      .then(setBatches)
      .catch(() => setBatches([]));
  }, [refreshToken]);

  const handleUndo = async (id: string) => {
    setWorking(id);
    setError(null);
    try {
      await undoImport(id);
      setBatches((prev) => prev?.filter((b) => b.id !== id) ?? null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed");
    } finally {
      setWorking(null);
      setConfirming(null);
    }
  };

  if (!batches || batches.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">
        Recent imports
      </p>
      {error && <p className="text-sm text-negative-text">{error}</p>}
      {batches.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-elevated text-sm"
        >
          <div className="min-w-0">
            <span className="block truncate text-content-primary" title={b.filename}>
              {b.imported_count} transaction{b.imported_count === 1 ? "" : "s"}
              {b.account_name && ` → ${b.account_name}`}
            </span>
            <span className="block truncate text-xs text-content-tertiary">
              {b.account_ref ?? b.filename}
              {b.date_from && b.date_to && ` · ${formatDay(b.date_from)} – ${formatDay(b.date_to)}`}
              {` · imported ${new Date(b.created_at).toLocaleDateString()}`}
            </span>
          </div>
          {confirming === b.id ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={working === b.id}
                className="px-2 py-1 text-xs text-content-secondary hover:bg-surface-hover rounded"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => void handleUndo(b.id)}
                disabled={working === b.id}
                className="px-2 py-1 text-xs font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded disabled:opacity-50"
              >
                {working === b.id ? "Removing…" : `Remove ${b.imported_count}`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(b.id)}
              className="shrink-0 px-2 py-1 text-xs text-content-secondary hover:bg-surface-hover hover:text-content-primary rounded"
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
