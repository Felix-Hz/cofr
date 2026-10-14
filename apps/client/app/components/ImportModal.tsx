import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  needsCheck,
  type RowDecision,
  sharedTarget,
  suggestedTarget,
  transferTarget,
} from "~/lib/import";
import type {
  Account,
  Category,
  ImportCommitResponse,
  ImportPreview,
  ImportPreviewRow,
} from "~/lib/schemas";
import { useTheme } from "~/lib/theme";
import { formatCurrency } from "~/lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

type Step = "pick" | "review" | "done";
type Filter = "all" | "review" | "duplicates";

const GROUP_PAGE = 100;
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
    const out = { fresh: 0, already: 0, duplicates: 0 };
    for (const r of preview?.rows ?? []) {
      if (r.status === "new") out.fresh += 1;
      else if (r.status === "already_imported") out.already += 1;
      else out.duplicates += 1;
    }
    return out;
  }, [preview]);
  // Live: drops as the user confirms guesses (the filter list itself stays put).
  const toCheck = useMemo(
    () => groups.filter((g) => needsCheck(g, decisions)).length,
    [groups, decisions],
  );

  const { resolvedTheme } = useTheme();
  const picker = useMemo<PickerContext>(() => {
    const byDirection = (credit: boolean) =>
      categories.filter((c) => (c.type === "income") === credit);
    return {
      debit: byDirection(false),
      credit: byDirection(true),
      accounts: accounts.filter((a) => a.id !== preview?.account_id),
      categoryById: new Map(categories.map((c) => [c.id, c])),
      accountById: new Map(accounts.map((a) => [a.id, a])),
      isDark: resolvedTheme === "dark",
    };
  }, [categories, accounts, preview?.account_id, resolvedTheme]);

  const visibleGroups = useMemo(() => {
    if (filter === "review") return groups.filter((g) => g.guessed);
    if (filter === "duplicates")
      return groups.filter((g) => g.rows.some((r) => r.status === "possible_duplicate"));
    return groups;
  }, [groups, filter]);

  const account = accounts.find((a) => a.id === preview?.account_id);
  const currency = preview?.currency ?? "NZD";

  // Stable callbacks so memoised group rows only re-render when their own rows change.
  const setRows = useCallback(
    (indexes: number[], patch: Partial<RowDecision>) =>
      setDecisions((prev) => {
        const next = new Map(prev);
        const reviewed = patch.target !== undefined ? { reviewed: true } : {};
        for (const i of indexes) {
          const current = next.get(i) ?? { include: true, target: "", reviewed: false };
          next.set(i, { ...current, ...patch, ...reviewed });
        }
        return next;
      }),
    [],
  );
  const toggleExpanded = useCallback(
    (key: string) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    [],
  );
  const rename = useCallback(
    (key: string, value: string) => setMerchantNames((prev) => new Map(prev).set(key, value)),
    [],
  );

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
    if (!result?.batch_id) return;
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
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-edge-default bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-emerald"
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
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-edge-default bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-emerald"
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
                {(toCheck > 0 || filter === "review") && (
                  <FilterChip
                    active={filter === "review"}
                    tone="warning"
                    onClick={() => setFilter(filter === "review" ? "all" : "review")}
                  >
                    {toCheck} to check
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
                      picker={picker}
                      name={merchantNames.get(group.key) ?? group.merchant}
                      expanded={expanded.has(group.key)}
                      onToggleExpanded={toggleExpanded}
                      onRename={rename}
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
              {undoState !== "done" && result.batch_id && (
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

interface PickerContext {
  debit: Category[];
  credit: Category[];
  /** Accounts other than the one being imported into. */
  accounts: Account[];
  categoryById: Map<string, Category>;
  accountById: Map<string, Account>;
  isDark: boolean;
}

const MIXED = "__mixed";

function TransferIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={`${className} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}

/**
 * Looks like cofr's category label (colour dot + name) but is a real native <select>
 * laid over it, so keyboard, screen readers and mobile pickers all work as usual.
 */
function CategoryPicker({
  direction,
  value,
  picker,
  guessed,
  label,
  onChange,
}: {
  direction: "debit" | "credit";
  value: ImportTarget | null;
  picker: PickerContext;
  guessed: boolean;
  label: string;
  onChange: (target: ImportTarget) => void;
}) {
  const categories = direction === "credit" ? picker.credit : picker.debit;
  const isTransfer = !!value?.startsWith("xfer:");
  const category = value?.startsWith("cat:") ? picker.categoryById.get(value.slice(4)) : undefined;
  const account = value?.startsWith("xfer:") ? picker.accountById.get(value.slice(5)) : undefined;
  const unset = value === "";

  const text =
    value === null
      ? "Mixed"
      : unset
        ? "Choose category"
        : isTransfer
          ? `${direction === "debit" ? "To" : "From"} ${account?.name ?? "account"}`
          : (category?.name ?? "Category");

  const tone =
    guessed || unset
      ? "border-warning-border bg-warning-bg text-warning-text"
      : isTransfer
        ? "border-transparent bg-accent-soft-bg text-accent-soft-text"
        : "border-edge-default bg-surface-primary text-content-primary hover:bg-surface-hover";

  return (
    <label
      title={
        guessed ? "Guessed. Pick the right category, or choose it again to confirm." : undefined
      }
      className={`relative inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-emerald ${tone}`}
    >
      {isTransfer ? (
        <TransferIcon />
      ) : category ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: picker.isDark ? category.color_dark : category.color_light }}
        />
      ) : null}
      <span className="truncate">{text}</span>
      {guessed && <span className="shrink-0 font-semibold">?</span>}
      <svg
        className="h-3 w-3 shrink-0 opacity-60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      <select
        aria-label={label}
        value={value === null ? MIXED : value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {value === null && (
          <option value={MIXED} disabled>
            Mixed
          </option>
        )}
        {unset && (
          <option value="" disabled>
            Choose category
          </option>
        )}
        <optgroup label="Category">
          {categories.map((c) => (
            <option key={c.id} value={categoryTarget(c.id)}>
              {c.name}
            </option>
          ))}
        </optgroup>
        {picker.accounts.length > 0 && (
          <optgroup label={direction === "debit" ? "Transfer to" : "Transfer from"}>
            {picker.accounts.map((a) => (
              <option key={a.id} value={transferTarget(a.id)}>
                {a.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}

/** Merchant shown as text; the pencil swaps in an input (16px, so iOS won't zoom). */
function MerchantName({
  name,
  muted,
  onRename,
}: {
  name: string;
  muted: boolean;
  onRename: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft.trim()) onRename(draft.trim());
      else setDraft(name);
    };
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={120}
        aria-label="Merchant name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(name);
            setEditing(false);
          }
        }}
        className="w-full min-w-0 rounded-md border border-edge-strong bg-surface-primary px-1.5 py-0 text-sm font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
      />
    );
  }

  return (
    <span className="group/name inline-flex min-w-0 items-center gap-1">
      <span
        className={`truncate text-sm font-medium ${muted ? "text-content-tertiary" : "text-content-primary"}`}
        title={name}
      >
        {name}
      </span>
      <button
        type="button"
        aria-label={`Rename ${name}`}
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="shrink-0 rounded p-0.5 text-content-tertiary opacity-60 transition-opacity hover:text-content-primary focus-visible:opacity-100 sm:opacity-0 sm:group-hover/name:opacity-100"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 9 17l.464-3.536z"
          />
        </svg>
      </button>
    </span>
  );
}

function Amount({
  amount,
  currency,
  direction,
  isTransfer,
  className = "text-sm",
}: {
  amount: number;
  currency: string;
  direction: "debit" | "credit";
  isTransfer: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-end gap-1 whitespace-nowrap font-medium tabular-nums text-content-primary ${className}`}
    >
      {isTransfer ? (
        <span className="rounded bg-accent-soft-bg px-1 py-0.5 text-[9px] font-semibold text-accent-soft-text">
          TR
        </span>
      ) : (
        direction === "credit" && (
          <span className="rounded bg-positive-bg px-1 py-0.5 text-[9px] font-semibold text-positive-text-strong">
            IN
          </span>
        )
      )}
      {formatCurrency(amount, currency)}
    </span>
  );
}

function DuplicateNote({ row }: { row: ImportPreviewRow }) {
  if (!row.duplicate_of) return null;
  return (
    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-warning-text">
      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span className="truncate">
        Possible duplicate of “{row.duplicate_of.label}”, {formatDay(row.duplicate_of.date)}
      </span>
    </p>
  );
}

interface GroupRowProps {
  group: MerchantGroup;
  decisions: Map<number, RowDecision>;
  currency: string;
  picker: PickerContext;
  name: string;
  expanded: boolean;
  onToggleExpanded: (key: string) => void;
  onRename: (key: string, value: string) => void;
  onSetRows: (indexes: number[], patch: Partial<RowDecision>) => void;
}

function GroupRowImpl({
  group,
  decisions,
  currency,
  picker,
  name,
  expanded,
  onToggleExpanded,
  onRename,
  onSetRows,
}: GroupRowProps) {
  const indexes = group.rows.map((r) => r.index);
  const included = group.rows.filter((r) => decisions.get(r.index)?.include).length;
  const target = sharedTarget(group, decisions);
  const single = group.rows.length === 1 ? group.rows[0] : null;
  const duplicates = group.rows.filter((r) => r.status === "possible_duplicate").length;
  const guessed = needsCheck(group, decisions) && target === suggestedTarget(group.rows[0]);
  const isTransfer = !!target?.startsWith("xfer:");
  const muted = included === 0;

  const tint = muted
    ? ""
    : isTransfer
      ? "bg-accent-soft-bg/30"
      : group.direction === "credit"
        ? "bg-positive-bg/50"
        : "";

  return (
    <li className={`transition-colors ${tint}`}>
      <div className="flex items-start gap-3 px-5 py-2.5">
        <input
          type="checkbox"
          aria-label={`Import ${name}`}
          checked={included > 0}
          ref={(el) => {
            if (el) el.indeterminate = included > 0 && included < group.rows.length;
          }}
          onChange={(e) => onSetRows(indexes, { include: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-edge-strong accent-emerald"
        />
        <div className={`min-w-0 flex-1 ${muted ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <MerchantName name={name} muted={muted} onRename={(v) => onRename(group.key, v)} />
            </div>
            <Amount
              amount={group.total}
              currency={currency}
              direction={group.direction}
              isTransfer={isTransfer}
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
            <div className="min-w-0 basis-full truncate text-[11px] text-content-tertiary sm:basis-auto sm:flex-1">
              {single ? (
                <>
                  <span className="tabular-nums">{formatDay(single.date)}</span>
                  {single.notes && <span> · {single.notes}</span>}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleExpanded(group.key)}
                  aria-expanded={expanded}
                  className="inline-flex items-center gap-1 font-medium text-content-secondary hover:text-content-primary"
                >
                  {group.rows.length} transactions
                  <svg
                    className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {duplicates > 0 && (
                    <span className="font-normal text-warning-text">
                      · {duplicates} possible duplicate{duplicates === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="min-w-0 sm:shrink-0">
              <CategoryPicker
                label={`Category for ${name}`}
                direction={group.direction}
                value={target}
                picker={picker}
                guessed={guessed}
                onChange={(t) => onSetRows(indexes, { target: t })}
              />
            </div>
          </div>
          {single && <DuplicateNote row={single} />}
        </div>
      </div>

      {expanded && !single && (
        <ul className="space-y-1 pb-2.5 pl-12 pr-5">
          {group.rows.map((row) => {
            const decision = decisions.get(row.index);
            const rowTarget = decision?.target ?? "";
            return (
              <li key={row.index} className="flex items-start gap-3 text-[11px]">
                <input
                  type="checkbox"
                  aria-label={`Import row from line ${row.line}`}
                  checked={!!decision?.include}
                  onChange={(e) => onSetRows([row.index], { include: e.target.checked })}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-emerald"
                />
                <div className={`min-w-0 flex-1 ${decision?.include ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
                    <span className="min-w-0 basis-full truncate text-content-tertiary sm:basis-auto sm:flex-1">
                      <span className="tabular-nums text-content-secondary">
                        {formatDay(row.date)}
                      </span>
                      {row.notes && ` · ${row.notes}`}
                    </span>
                    <CategoryPicker
                      label={`Category for line ${row.line}`}
                      direction={row.direction}
                      value={rowTarget}
                      picker={picker}
                      guessed={row.suggestion_source === "default" && !decision?.reviewed}
                      onChange={(t) => onSetRows([row.index], { target: t })}
                    />
                    <Amount
                      amount={row.amount}
                      currency={currency}
                      direction={row.direction}
                      isTransfer={rowTarget.startsWith("xfer:")}
                      className="ml-auto text-[11px] sm:ml-0 sm:w-20"
                    />
                  </div>
                  <DuplicateNote row={row} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Re-render a group only when one of its own rows' decisions (or its display props) changed. */
const GroupRow = memo(GroupRowImpl, (prev, next) => {
  if (
    prev.group !== next.group ||
    prev.name !== next.name ||
    prev.expanded !== next.expanded ||
    prev.currency !== next.currency ||
    prev.picker !== next.picker ||
    prev.onSetRows !== next.onSetRows ||
    prev.onRename !== next.onRename ||
    prev.onToggleExpanded !== next.onToggleExpanded
  )
    return false;
  return prev.group.rows.every((r) => prev.decisions.get(r.index) === next.decisions.get(r.index));
});
