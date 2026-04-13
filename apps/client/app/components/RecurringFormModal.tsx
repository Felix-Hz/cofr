import { useEffect, useMemo, useRef, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import { useAccounts } from "~/lib/accounts";
import { useCategories } from "~/lib/categories";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import { previewUpcoming } from "~/lib/recurring";
import type {
  RecurringIntervalUnit,
  RecurringRule,
  RecurringRuleCreate,
  RecurringRuleType,
} from "~/lib/schemas";

interface RecurringFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringRuleCreate) => Promise<void>;
  onDelete?: () => Promise<void>;
  rule?: RecurringRule | null;
  isLoading?: boolean;
  /** Optional prefill from "make recurring" hand-off in another modal. */
  prefill?: Partial<RecurringRuleCreate> | null;
}

type CadencePreset = "weekly" | "fortnightly" | "monthly" | "yearly" | "custom";

interface CadenceState {
  preset: CadencePreset;
  unit: RecurringIntervalUnit;
  count: number;
}

function presetFor(unit: RecurringIntervalUnit, count: number): CadencePreset {
  if (unit === "week" && count === 1) return "weekly";
  if (unit === "week" && count === 2) return "fortnightly";
  if (unit === "month" && count === 1) return "monthly";
  if (unit === "year" && count === 1) return "yearly";
  return "custom";
}

const PRESETS: { id: CadencePreset; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "custom", label: "Custom" },
];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatPreviewDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RecurringFormModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  rule,
  isLoading = false,
  prefill,
}: RecurringFormModalProps) {
  const { activeCategories } = useCategories();
  const { accounts } = useAccounts();

  const [type, setType] = useState<RecurringRuleType>("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NZD");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState<CadenceState>({
    preset: "monthly",
    unit: "month",
    count: 1,
  });
  const [startDate, setStartDate] = useState(todayIso());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isEditMode = !!rule;

  const expenseCategories = useMemo(
    () => activeCategories.filter((c) => c.type === "expense"),
    [activeCategories],
  );
  const incomeCategories = useMemo(
    () => activeCategories.filter((c) => c.type === "income"),
    [activeCategories],
  );
  const shouldHideIncomeCategory = type === "income" && incomeCategories.length <= 1;

  const defaultExpenseCategoryId =
    expenseCategories.find((c) => c.slug === "miscellaneous")?.id || expenseCategories[0]?.id || "";
  const defaultIncomeCategoryId = incomeCategories[0]?.id || "";

  const storedDefaultAccountId =
    typeof window !== "undefined" ? localStorage.getItem("cofr_default_account_id") : null;
  const defaultAccountId =
    accounts.find((a) => a.id === storedDefaultAccountId)?.id || accounts[0]?.id || "";

  useEffect(() => {
    if (!isOpen) return;
    if (rule) {
      setType(rule.type);
      setName(rule.name);
      setAmount(rule.amount.toString());
      setCurrency(rule.currency);
      setAccountId(rule.account_id);
      setToAccountId(rule.to_account_id ?? "");
      setCategoryId(rule.category_id ?? "");
      setMerchant(rule.merchant ?? "");
      setDescription(rule.description ?? "");
      setCadence({
        preset: presetFor(rule.interval_unit, rule.interval_count),
        unit: rule.interval_unit,
        count: rule.interval_count,
      });
      setStartDate(rule.start_date);
      setHasEndDate(!!rule.end_date);
      setEndDate(rule.end_date ?? "");
      setShowDeleteConfirm(false);
      return;
    }

    const initialType = (prefill?.type as RecurringRuleType | undefined) ?? "expense";
    setType(initialType);
    setName(prefill?.name ?? "");
    setAmount(prefill?.amount != null ? String(prefill.amount) : "");
    setCurrency(prefill?.currency ?? "NZD");
    setAccountId(prefill?.account_id ?? defaultAccountId);
    setToAccountId(prefill?.to_account_id ?? "");
    setCategoryId(
      prefill?.category_id ??
        (initialType === "income" ? defaultIncomeCategoryId : defaultExpenseCategoryId),
    );
    setMerchant(prefill?.merchant ?? "");
    setDescription(prefill?.description ?? "");
    setCadence({ preset: "monthly", unit: "month", count: 1 });
    setStartDate(prefill?.start_date ?? todayIso());
    setHasEndDate(!!prefill?.end_date);
    setEndDate(prefill?.end_date ?? "");
    setShowDeleteConfirm(false);
  }, [isOpen, rule, prefill, defaultAccountId, defaultExpenseCategoryId, defaultIncomeCategoryId]);

  const handleTypeSwitch = (next: RecurringRuleType) => {
    if (next === type) return;
    setType(next);
    if (next === "income") {
      setCategoryId(defaultIncomeCategoryId);
      setToAccountId("");
      setMerchant("");
    } else if (next === "expense") {
      setCategoryId(defaultExpenseCategoryId);
      setToAccountId("");
    } else {
      // transfer
      setCategoryId("");
      setMerchant("");
      if (!toAccountId) {
        const other = accounts.find((a) => a.id !== accountId);
        if (other) setToAccountId(other.id);
      }
    }
  };

  const handlePresetChange = (preset: CadencePreset) => {
    if (preset === cadence.preset) return;
    if (preset === "weekly") setCadence({ preset, unit: "week", count: 1 });
    else if (preset === "fortnightly") setCadence({ preset, unit: "week", count: 2 });
    else if (preset === "monthly") setCadence({ preset, unit: "month", count: 1 });
    else if (preset === "yearly") setCadence({ preset, unit: "year", count: 1 });
    else setCadence({ preset: "custom", unit: cadence.unit, count: Math.max(1, cadence.count) });
  };

  const upcoming = useMemo(
    () =>
      previewUpcoming(
        startDate,
        cadence.unit,
        cadence.count,
        3,
        hasEndDate && endDate ? endDate : null,
      ),
    [startDate, cadence.unit, cadence.count, hasEndDate, endDate],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number.parseFloat(amount);
    const effectiveCategoryId =
      type === "income" && shouldHideIncomeCategory ? defaultIncomeCategoryId : categoryId;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    if (!name.trim()) return;
    if (!accountId) return;
    if (type === "transfer" && !toAccountId) return;
    if (type === "transfer" && toAccountId === accountId) return;
    if (type !== "transfer" && !effectiveCategoryId) return;

    const data: RecurringRuleCreate = {
      type,
      name: name.trim(),
      amount: parsedAmount,
      currency,
      account_id: accountId,
      to_account_id: type === "transfer" ? toAccountId : null,
      category_id: type === "transfer" ? null : effectiveCategoryId,
      merchant: type === "expense" && merchant.trim() ? merchant.trim() : null,
      description: description.trim(),
      interval_unit: cadence.unit,
      interval_count: cadence.count,
      day_of_month: null,
      day_of_week: null,
      start_date: startDate,
      end_date: hasEndDate && endDate ? endDate : null,
    };

    await onSubmit(data);
  };

  useBodyScrollLock(isOpen);
  useModalKeyboardShortcuts({
    isOpen,
    onEscape: onClose,
    onEnter:
      showDeleteConfirm && onDelete
        ? () => {
            setShowDeleteConfirm(false);
            void onDelete();
          }
        : () => formRef.current?.requestSubmit(),
    disableEscape: isLoading,
    disableEnter: isLoading,
    allowEnterFromEditable: true,
  });

  if (!isOpen) return null;

  const titleText = isEditMode
    ? "Edit Recurring Rule"
    : type === "transfer"
      ? "New Recurring Transfer"
      : type === "income"
        ? "New Recurring Income"
        : "New Recurring Expense";

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div
          className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[85vh] flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recurring-form-title"
        >
          <h3
            id="recurring-form-title"
            className="hidden sm:block text-lg font-semibold mb-3 shrink-0"
          >
            {titleText}
          </h3>

          {/* Type toggle */}
          <div className="flex rounded-lg bg-surface-elevated p-0.5 mb-3 sm:mb-4 shrink-0">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeSwitch(t)}
                disabled={isEditMode}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  type === t
                    ? t === "income"
                      ? "bg-positive-bg text-positive-text-strong shadow-sm"
                      : "bg-emerald text-white shadow-sm"
                    : "text-content-tertiary hover:text-content-secondary"
                } ${isEditMode ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto overflow-x-hidden overscroll-contain touch-auto flex-1 min-h-0 space-y-2 sm:space-y-4 px-0.5">
              {/* Name */}
              <div>
                <label
                  htmlFor="rec-name"
                  className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                >
                  Name <span className="text-negative-text">*</span>
                </label>
                <input
                  id="rec-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Rent, Salary, Savings transfer"
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  required
                />
              </div>

              {/* Amount + Currency */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label
                    htmlFor="rec-amount"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Amount <span className="text-negative-text">*</span>
                  </label>
                  <input
                    id="rec-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  />
                </div>
                <div className="w-24 sm:w-28">
                  <label
                    htmlFor="rec-currency"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Currency <span className="text-negative-text">*</span>
                  </label>
                  <select
                    id="rec-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account(s) */}
              {accounts.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="rec-account"
                      className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                    >
                      {type === "transfer"
                        ? "From Account"
                        : type === "income"
                          ? "Into Account"
                          : "From Account"}{" "}
                      <span className="text-negative-text">*</span>
                    </label>
                    <select
                      id="rec-account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                      required
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {type === "transfer" && (
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor="rec-to-account"
                        className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                      >
                        To Account <span className="text-negative-text">*</span>
                      </label>
                      <select
                        id="rec-to-account"
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                        required
                      >
                        <option value="">Select…</option>
                        {accounts
                          .filter((a) => a.id !== accountId)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Category (expense / income) */}
              {type !== "transfer" && !shouldHideIncomeCategory && (
                <div>
                  <label
                    htmlFor="rec-category"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Category <span className="text-negative-text">*</span>
                  </label>
                  <select
                    id="rec-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  >
                    {(type === "income" ? incomeCategories : expenseCategories).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Merchant (expense only) + Description */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                {type === "expense" && (
                  <div className="sm:w-[42%]">
                    <label
                      htmlFor="rec-merchant"
                      className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                    >
                      Merchant
                    </label>
                    <input
                      id="rec-merchant"
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      maxLength={120}
                      autoComplete="off"
                      className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                      placeholder="e.g. Spark"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="rec-description"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Description
                  </label>
                  <input
                    id="rec-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={360}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              {/* Cadence */}
              <div>
                <span className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1">
                  Repeats <span className="text-negative-text">*</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetChange(p.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        cadence.preset === p.id
                          ? "bg-emerald text-white border-emerald"
                          : "bg-surface-primary text-content-secondary border-edge-strong hover:bg-surface-hover"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {cadence.preset === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-content-tertiary">Every</span>
                    <input
                      type="number"
                      min="1"
                      max="366"
                      value={cadence.count}
                      onChange={(e) =>
                        setCadence((c) => ({
                          ...c,
                          count: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      className="w-16 px-2 py-1 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    />
                    <select
                      value={cadence.unit}
                      onChange={(e) =>
                        setCadence((c) => ({
                          ...c,
                          unit: e.target.value as RecurringIntervalUnit,
                        }))
                      }
                      className="px-2 py-1 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    >
                      <option value="day">{cadence.count === 1 ? "day" : "days"}</option>
                      <option value="week">{cadence.count === 1 ? "week" : "weeks"}</option>
                      <option value="month">{cadence.count === 1 ? "month" : "months"}</option>
                      <option value="year">{cadence.count === 1 ? "year" : "years"}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Start / End */}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="rec-start"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Starts <span className="text-negative-text">*</span>
                  </label>
                  <input
                    id="rec-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  />
                </div>
                <div className="flex-1">
                  <span className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1">
                    Ends
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-content-secondary cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => setHasEndDate(e.target.checked)}
                        className="w-4 h-4 rounded border-edge-strong text-emerald focus:ring-emerald accent-emerald"
                      />
                      On
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={!hasEndDate}
                      min={startDate}
                      className="flex-1 min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Upcoming preview */}
              {upcoming.length > 0 && (
                <div className="rounded-md bg-surface-elevated px-3 py-2">
                  <p className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1">
                    Next occurrences
                  </p>
                  <ul className="space-y-0.5">
                    {upcoming.map((iso) => (
                      <li key={iso} className="text-sm text-content-secondary">
                        {formatPreviewDate(iso)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-3 sm:pt-4 shrink-0">
              <div>
                {isEditMode &&
                  onDelete &&
                  (showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-negative-text">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          void onDelete();
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded-md disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {isLoading ? "Deleting..." : "Yes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
                        disabled={isLoading}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-sm font-medium text-negative-text hover:bg-negative-bg rounded-md"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
