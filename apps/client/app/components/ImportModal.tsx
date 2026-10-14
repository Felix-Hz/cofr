import { useCallback, useEffect, useMemo, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import { commitImport, getAccounts, getCategories, previewImport, undoImport } from "~/lib/api";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import {
  buildDecisions,
  categoryTarget,
  groupRows,
  type ImportTarget,
  importTotals,
  initialDecision,
  type MerchantGroup,
  type RowDecision,
  sharedTarget,
  transferTarget,
} from "~/lib/import";
import type {
  Account,
  Category,
  ImportCommitResponse,
  ImportPreview,
  ImportPreviewRow,
} from "~/lib/schemas";
import { formatCurrency } from "~/lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

type Step = "pick" | "review" | "done";
type Filter = "all" | "review" | "duplicates";

const GROUP_PAGE = 100;
const MIXED = "__mixed";

/** `2025-03-14` → `14 Mar`, in local time (Date parsing would treat it as UTC). */
function formatDay(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export default function ImportModal({ isOpen, onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Map<number, RowDecision>>(new Map());
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [showErrors, setShowErrors] = useState(false);
  const [groupLimit, setGroupLimit] = useState(GROUP_PAGE);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const [undoState, setUndoState] = useState<"idle" | "working" | "done">("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setStep("pick");
    setFile(null);
    setPreview(null);
    setError(null);
    setDecisions(new Map());
    setMerchantNames(new Map());
    setExpanded(new Set());
    setFilter("all");
    setShowErrors(false);
    setGroupLimit(GROUP_PAGE);
    setResult(null);
    setUndoState("idle");
    getCategories()
      .then((cats) => setCategories(cats.filter((c) => c.is_active)))
      .catch(() => setCategories([]));
    getAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, [isOpen]);

  const loadPreview = useCallback(
    async (nextFile: File, options: { accountId?: string; currency?: string } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const next = await previewImport(nextFile, options);
        setFile(nextFile);
        setPreview(next);
        setDecisions((prev) => {
          const merged = new Map<number, RowDecision>();
          for (const row of next.rows)
            merged.set(row.index, initialDecision(row, prev.get(row.index)));
          return merged;
        });
        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read this file");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleFile = (picked: File | undefined) => {
    if (!picked) return;
    setDecisions(new Map());
    setMerchantNames(new Map());
    void loadPreview(picked);
  };

  const groups = useMemo(() => (preview ? groupRows(preview.rows) : []), [preview]);
  const totals = useMemo(
    () => (preview ? importTotals(preview.rows, decisions) : null),
    [preview, decisions],
  );
  const counts = useMemo(() => {
    const rows = preview?.rows ?? [];
    return {
      fresh: rows.filter((r) => r.status === "new").length,
      already: rows.filter((r) => r.status === "already_imported").length,
      duplicates: rows.filter((r) => r.status === "possible_duplicate").length,
      review: groups.filter((g) => g.guessed).length,
    };
  }, [preview, groups]);

  const visibleGroups = useMemo(() => {
    if (filter === "review") return groups.filter((g) => g.guessed);
    if (filter === "duplicates")
      return groups.filter((g) => g.rows.some((r) => r.status === "possible_duplicate"));
    return groups;
  }, [groups, filter]);

  const account = accounts.find((a) => a.id === preview?.account_id);
  const currency = preview?.currency ?? "NZD";

  const setRows = (indexes: number[], patch: Partial<RowDecision>) =>
    setDecisions((prev) => {
      const next = new Map(prev);
      for (const i of indexes) {
        const current = next.get(i) ?? { include: true, target: "" };
        next.set(i, { ...current, ...patch });
      }
      return next;
    });

  const handleCommit = async () => {
    if (!file || !preview || !totals || totals.count === 0 || totals.undecided > 0) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await commitImport(file, {
        account_id: preview.account_id,
        currency: preview.currency,
        rows: buildDecisions(preview.rows, decisions, merchantNames),
      });
      setResult(res);
      setStep("done");
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  const handleUndo = async () => {
    if (!result) return;
    setUndoState("working");
    try {
      await undoImport(result.batch_id);
      setUndoState("done");
      onImported?.();
    } catch (err) {
      setUndoState("idle");
      setError(err instanceof Error ? err.message : "Undo failed");
    }
  };

  const canCommit =
    !!totals && totals.count > 0 && totals.undecided === 0 && !committing && !loading;

  useModalKeyboardShortcuts({
    isOpen,
    onEscape: onClose,
    disableEscape: committing,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-none">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={committing ? undefined : onClose}
      />

      <div className="relative w-full max-w-3xl bg-surface-primary rounded-xl border border-edge-default shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-default shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-content-heading">Import transactions</h2>
            {preview && step === "review" && (
              <p className="text-xs text-content-tertiary truncate">
                {preview.bank}
                {preview.account_ref && ` · ${preview.account_ref}`}
                {preview.date_from &&
                  preview.date_to &&
                  ` · ${formatDay(preview.date_from)} – ${formatDay(preview.date_to, true)}`}
                {` · ${preview.rows.length} rows`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={committing}
            aria-label="Close"
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

        {/* ── Step 1: pick a file ── */}
        {step === "pick" && (
          <div className="px-5 py-5 space-y-4 overflow-y-auto touch-auto">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-emerald bg-accent-soft-bg"
                  : "border-edge-strong hover:bg-surface-hover"
              } ${loading ? "pointer-events-none opacity-70" : ""}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald border-t-transparent" />
                  <span className="text-sm text-content-secondary">Reading statement…</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-8 w-8 text-content-tertiary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-sm font-medium text-content-primary">
                    Drop a bank statement CSV here, or <span className="text-emerald">browse</span>
                  </span>
                  <span className="text-xs text-content-tertiary">
                    You'll review everything before it's saved.
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="rounded-lg bg-surface-elevated px-3 py-2.5 text-xs text-content-secondary space-y-1">
              <p>
                <span className="font-medium text-content-primary">Supported:</span> ANZ New Zealand
                account exports (CSV).
              </p>
              <p className="text-content-tertiary">
                Already-imported transactions are recognised automatically, so overlapping
                statements are safe to import.
              </p>
            </div>
            {error && <ErrorNote message={error} />}
          </div>
        )}

        {/* ── Step 2: review ── */}
        {step === "review" && preview && totals && (
          <>
            <div className="px-5 pt-4 pb-3 space-y-3 border-b border-edge-default shrink-0">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[12rem]">
                  <span className="block text-xs font-medium text-content-secondary mb-1">
                    Import into
                  </span>
                  <select
                    value={preview.account_id}
                    disabled={loading || committing}
                    onChange={(e) =>
                      file && void loadPreview(file, { accountId: e.target.value, currency })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-edge-default bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-emerald"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-28">
                  <span className="block text-xs font-medium text-content-secondary mb-1">
                    Currency
                  </span>
                  <select
                    value={currency}
                    disabled={loading || committing}
                    onChange={(e) =>
                      file &&
                      void loadPreview(file, {
                        accountId: preview.account_id,
                        currency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-edge-default bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-emerald"
                  >
                    {[...new Set([currency, ...SUPPORTED_CURRENCIES])].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                {loading && (
                  <div className="pb-2.5 animate-spin rounded-full h-4 w-4 border-2 border-emerald border-t-transparent" />
                )}
              </div>
              {preview.account_remembered && (
                <p className="text-xs text-content-tertiary">
                  Account remembered from your last import of {preview.account_ref}.
                </p>
              )}

              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter rows">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  {counts.fresh} new
                </FilterChip>
                {counts.review > 0 && (
                  <FilterChip
                    active={filter === "review"}
                    tone="warning"
                    onClick={() => setFilter(filter === "review" ? "all" : "review")}
                  >
                    {counts.review} to check
                  </FilterChip>
                )}
                {counts.duplicates > 0 && (
                  <FilterChip
                    active={filter === "duplicates"}
                    tone="warning"
                    onClick={() => setFilter(filter === "duplicates" ? "all" : "duplicates")}
                  >
                    {counts.duplicates} possible duplicate{counts.duplicates === 1 ? "" : "s"}
                  </FilterChip>
                )}
                {counts.already > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs text-content-tertiary bg-surface-elevated">
                    {counts.already} already imported
                  </span>
                )}
                {preview.errors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrors(!showErrors)}
                    className="px-2.5 py-1 rounded-full text-xs text-negative-text bg-negative-bg"
                  >
                    {preview.errors.length} unreadable
                  </button>
                )}
              </div>
              {showErrors && (
                <ul className="rounded-lg bg-negative-bg px-3 py-2 text-xs text-negative-text space-y-0.5 max-h-28 overflow-y-auto">
                  {preview.errors.map((e) => (
                    <li key={`${e.line}-${e.message}`}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain touch-auto">
              {visibleGroups.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-content-tertiary">
                  {counts.already === preview.rows.length
                    ? "Everything in this file has already been imported."
                    : "Nothing here."}
                </p>
              ) : (
                <ul className="divide-y divide-edge-default">
                  {visibleGroups.slice(0, groupLimit).map((group) => (
                    <GroupRow
                      key={group.key}
                      group={group}
                      decisions={decisions}
                      currency={currency}
                      categories={categories}
                      accounts={accounts}
                      accountId={preview.account_id}
                      name={merchantNames.get(group.key) ?? group.merchant}
                      expanded={expanded.has(group.key)}
                      onToggleExpanded={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.key)) next.delete(group.key);
                          else next.add(group.key);
                          return next;
                        })
                      }
                      onRename={(value) =>
                        setMerchantNames((prev) => new Map(prev).set(group.key, value))
                      }
                      onSetRows={setRows}
                    />
                  ))}
                </ul>
              )}
              {visibleGroups.length > groupLimit && (
                <div className="px-5 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setGroupLimit((n) => n + GROUP_PAGE)}
                    className="text-sm text-emerald hover:underline"
                  >
                    Show {Math.min(GROUP_PAGE, visibleGroups.length - groupLimit)} more
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-edge-default shrink-0 space-y-2">
              {error && <ErrorNote message={error} />}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-content-secondary">
                  {totals.undecided > 0 ? (
                    <span className="text-warning-text">
                      {totals.undecided} selected row{totals.undecided === 1 ? " needs" : "s need"}{" "}
                      a category
                    </span>
                  ) : (
                    <>
                      {totals.moneyOut > 0 && (
                        <span>{formatCurrency(totals.moneyOut, currency)} out</span>
                      )}
                      {totals.moneyOut > 0 && totals.moneyIn > 0 && " · "}
                      {totals.moneyIn > 0 && (
                        <span className="text-positive-text">
                          {formatCurrency(totals.moneyIn, currency)} in
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("pick");
                      setError(null);
                    }}
                    disabled={committing}
                    className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
                  >
                    Other file
                  </button>
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={!canCommit}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md transition-colors disabled:opacity-50"
                  >
                    {committing
                      ? "Importing…"
                      : `Import ${totals.count} transaction${totals.count === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: done ── */}
        {step === "done" && result && (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-positive-bg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {undoState === "done" ? (
              <p className="text-base font-medium text-content-primary">
                Import undone. Nothing from this file remains.
              </p>
            ) : (
              <>
                <p className="text-base font-medium text-content-primary">
                  Imported {result.imported} transaction{result.imported === 1 ? "" : "s"}
                  {account && ` into ${account.name}`}
                </p>
                <p className="text-sm text-content-tertiary">
                  {[
                    result.transfers > 0 &&
                      `${result.transfers} recorded as transfer${result.transfers === 1 ? "" : "s"}`,
                    result.skipped > 0 && `${result.skipped} skipped`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nothing skipped"}
                </p>
              </>
            )}
            {error && <ErrorNote message={error} />}
            <div className="flex items-center gap-2 pt-2">
              {undoState !== "done" && (
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoState === "working"}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
                >
                  {undoState === "working" ? "Undoing…" : "Undo import"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-negative-bg text-sm text-negative-text">{message}</div>
  );
}

function FilterChip({
  active,
  tone = "neutral",
  onClick,
  children,
}: {
  active: boolean;
  tone?: "neutral" | "warning";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const idle =
    tone === "warning"
      ? "bg-warning-bg text-warning-text border-warning-border"
      : "bg-surface-elevated text-content-secondary border-transparent";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active ? "border-emerald bg-accent-soft-bg text-accent-soft-text" : idle
      }`}
    >
      {children}
    </button>
  );
}

function TargetSelect({
  direction,
  value,
  categories,
  accounts,
  accountId,
  onChange,
  compact = false,
  label,
}: {
  direction: "debit" | "credit";
  value: ImportTarget | null;
  categories: Category[];
  accounts: Account[];
  accountId: string;
  onChange: (target: ImportTarget) => void;
  compact?: boolean;
  label: string;
}) {
  const fitting = categories.filter((c) => (c.type === "income") === (direction === "credit"));
  const others = accounts.filter((a) => a.id !== accountId);
  return (
    <select
      aria-label={label}
      value={value === null ? MIXED : value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-edge-default bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-emerald ${
        compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
      } ${value === "" ? "border-warning-border" : ""}`}
    >
      {value === null && (
        <option value={MIXED} disabled>
          Mixed
        </option>
      )}
      {value === "" && (
        <option value="" disabled>
          Choose…
        </option>
      )}
      <optgroup label="Category">
        {fitting.map((c) => (
          <option key={c.id} value={categoryTarget(c.id)}>
            {c.name}
          </option>
        ))}
      </optgroup>
      {others.length > 0 && (
        <optgroup label={direction === "debit" ? "Transfer to" : "Transfer from"}>
          {others.map((a) => (
            <option key={a.id} value={transferTarget(a.id)}>
              {a.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

const SOURCE_HINTS: Record<string, { text: string; className: string }> = {
  history: { text: "From your history", className: "text-content-tertiary" },
  rule: { text: "Suggested", className: "text-content-tertiary" },
  default: { text: "Guessed, check it", className: "text-warning-text" },
};

function GroupRow({
  group,
  decisions,
  currency,
  categories,
  accounts,
  accountId,
  name,
  expanded,
  onToggleExpanded,
  onRename,
  onSetRows,
}: {
  group: MerchantGroup;
  decisions: Map<number, RowDecision>;
  currency: string;
  categories: Category[];
  accounts: Account[];
  accountId: string;
  name: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRename: (value: string) => void;
  onSetRows: (indexes: number[], patch: Partial<RowDecision>) => void;
}) {
  const indexes = group.rows.map((r) => r.index);
  const included = group.rows.filter((r) => decisions.get(r.index)?.include).length;
  const target = sharedTarget(group, decisions);
  const single = group.rows.length === 1 ? group.rows[0] : null;
  const duplicates = group.rows.filter((r) => r.status === "possible_duplicate").length;
  const source = group.guessed ? "default" : group.rows[0].suggestion_source;
  const hint = source ? SOURCE_HINTS[source] : null;
  const sign = group.direction === "credit" ? "+" : "−";

  return (
    <li className={included === 0 ? "bg-surface-elevated/40" : ""}>
      <div className="flex items-start gap-3 px-5 py-3">
        <input
          type="checkbox"
          aria-label={`Import ${name}`}
          checked={included > 0}
          ref={(el) => {
            if (el) el.indeterminate = included > 0 && included < group.rows.length;
          }}
          onChange={(e) => onSetRows(indexes, { include: e.target.checked })}
          className="mt-2 h-4 w-4 accent-emerald shrink-0"
        />
        <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
          <div className="min-w-0">
            <input
              type="text"
              value={name}
              maxLength={120}
              aria-label="Merchant name"
              onChange={(e) => onRename(e.target.value)}
              className={`w-full -ml-1 px-1 py-0.5 rounded text-sm font-medium bg-transparent border border-transparent hover:border-edge-default focus:border-edge-strong focus:outline-none ${
                included === 0 ? "text-content-tertiary line-through" : "text-content-primary"
              }`}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-content-tertiary">
              {single ? (
                <>
                  <span>{formatDay(single.date)}</span>
                  {single.notes && <span className="truncate max-w-full">{single.notes}</span>}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  className="inline-flex items-center gap-1 hover:text-content-primary"
                  aria-expanded={expanded}
                >
                  {group.rows.length} transactions
                  <svg
                    className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {duplicates > 0 && !single && (
                <span className="text-warning-text">
                  {duplicates} possible duplicate{duplicates === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {single?.duplicate_of && <DuplicateNote row={single} currency={currency} />}
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <TargetSelect
                label={`Category for ${name}`}
                direction={group.direction}
                value={target}
                categories={categories}
                accounts={accounts}
                accountId={accountId}
                onChange={(t) => onSetRows(indexes, { target: t })}
              />
              {hint && target === categoryTarget(group.rows[0].suggested_category_id ?? "") && (
                <p className={`mt-0.5 text-[11px] ${hint.className}`}>{hint.text}</p>
              )}
            </div>
            <span
              className={`pt-1.5 text-sm tabular-nums whitespace-nowrap ${
                group.direction === "credit" ? "text-positive-text" : "text-content-primary"
              }`}
            >
              {sign}
              {formatCurrency(group.total, currency)}
            </span>
          </div>
        </div>
      </div>

      {expanded && !single && (
        <ul className="pb-2 pl-12 pr-5 space-y-1">
          {group.rows.map((row) => {
            const decision = decisions.get(row.index);
            return (
              <li
                key={row.index}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-start text-xs"
              >
                <input
                  type="checkbox"
                  aria-label={`Import row from line ${row.line}`}
                  checked={!!decision?.include}
                  onChange={(e) => onSetRows([row.index], { include: e.target.checked })}
                  className="mt-1.5 h-3.5 w-3.5 accent-emerald"
                />
                <div className="min-w-0 grid gap-1 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
                  <div className="min-w-0 text-content-secondary">
                    <span className="text-content-primary">{formatDay(row.date)}</span>
                    {row.notes && <span className="ml-2 text-content-tertiary">{row.notes}</span>}
                    {row.duplicate_of && <DuplicateNote row={row} currency={currency} />}
                  </div>
                  <TargetSelect
                    compact
                    label={`Category for line ${row.line}`}
                    direction={row.direction}
                    value={decision?.target ?? ""}
                    categories={categories}
                    accounts={accounts}
                    accountId={accountId}
                    onChange={(t) => onSetRows([row.index], { target: t })}
                  />
                </div>
                <span className="pt-1 tabular-nums whitespace-nowrap text-content-secondary">
                  {formatCurrency(row.amount, currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function DuplicateNote({ row, currency }: { row: ImportPreviewRow; currency: string }) {
  if (!row.duplicate_of) return null;
  return (
    <p className="mt-1 text-xs text-warning-text">
      Looks like “{row.duplicate_of.label}” ({formatCurrency(row.duplicate_of.amount, currency)},{" "}
      {formatDay(row.duplicate_of.date)}) you already have. Skipped unless you tick it.
    </p>
  );
}
