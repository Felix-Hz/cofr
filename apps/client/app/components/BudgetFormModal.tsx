import { useEffect, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import { generateBudgetDefaultName } from "~/lib/budgets";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import type { Budget, BudgetCreate, BudgetUpdate, Category } from "~/lib/schemas";

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetCreate | BudgetUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
  budget?: Budget | null;
  categories: Category[];
  isLoading?: boolean;
  defaultCurrency?: string;
}

type PeriodType = "weekly" | "monthly" | "custom";
type BudgetType = "expense" | "income";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

export default function BudgetFormModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  budget,
  categories,
  isLoading = false,
  defaultCurrency = "USD",
}: BudgetFormModalProps) {
  const isEditMode = !!budget;

  const [name, setName] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("expense");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameWasAutoFilled, setNameWasAutoFilled] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eligibleCategories = categories.filter((c) => c.is_active && c.type === budgetType);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen resets form
  useEffect(() => {
    if (budget) {
      setName(budget.name);
      setBudgetType(budget.budget_type as BudgetType);
      setPeriodType(budget.period_type as PeriodType);
      setAmount(String(budget.amount));
      setCurrency(budget.currency);
      setSelectedCategoryIds(budget.category_ids);
      setStartDate(toDateInput(budget.start_date));
      setEndDate(toDateInput(budget.end_date));
      setNameWasAutoFilled(false);
    } else {
      setName("");
      setBudgetType("expense");
      setPeriodType("monthly");
      setAmount("");
      setCurrency(defaultCurrency);
      setSelectedCategoryIds([]);
      setStartDate("");
      setEndDate("");
      setNameWasAutoFilled(false);
    }
    setError(null);
    setConfirmDelete(false);
  }, [budget, isOpen]);

  // Auto-fill name when categories change (create mode only)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit name/nameWasAutoFilled to avoid infinite loop
  useEffect(() => {
    if (isEditMode) return;
    if (name && !nameWasAutoFilled) return;
    const names = selectedCategoryIds
      .map((id) => categories.find((c) => c.id === id)?.name ?? "")
      .filter(Boolean);
    const generated = generateBudgetDefaultName(names, budgetType);
    setName(generated);
    setNameWasAutoFilled(true);
  }, [selectedCategoryIds, budgetType, isEditMode]);

  // Clear selected categories that don't match the new budgetType
  useEffect(() => {
    setSelectedCategoryIds((ids) =>
      ids.filter((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat?.type === budgetType;
      }),
    );
  }, [budgetType, categories]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = Number.parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (periodType === "custom" && (!startDate || !endDate)) {
      setError("Start and end dates are required for custom periods");
      return;
    }
    if (periodType === "custom" && startDate > endDate) {
      setError("Start date must be before end date");
      return;
    }
    try {
      const data: BudgetCreate = {
        name: name.trim(),
        period_type: periodType,
        amount: amountNum,
        currency,
        budget_type: budgetType,
        start_date: periodType === "custom" ? new Date(startDate) : undefined,
        end_date: periodType === "custom" ? new Date(endDate) : undefined,
        category_ids: selectedCategoryIds,
      };
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
    }
  };

  useBodyScrollLock(isOpen);
  useModalKeyboardShortcuts({ isOpen, onEscape: onClose });

  if (!isOpen) return null;

  const canSubmit = !isLoading && name.trim() && amount && Number.parseFloat(amount) > 0;

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold mb-5 text-content-primary">
            {isEditMode ? "Edit Budget" : "New Budget"}
          </h3>

          {error && (
            <div className="flex items-start gap-2.5 bg-negative-bg border border-negative-text/20 px-3.5 py-2.5 rounded-lg mb-4 animate-slide-down">
              <svg
                className="w-4 h-4 text-negative-text shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-sm text-negative-text leading-snug">{error}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto overscroll-contain touch-auto flex-1 space-y-4 pr-0.5"
          >
            {/* Budget type */}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                Type
              </label>
              <div className="flex rounded-lg bg-surface-elevated p-0.5">
                <button
                  type="button"
                  onClick={() => setBudgetType("expense")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    budgetType === "expense"
                      ? "bg-emerald text-white shadow-sm"
                      : "text-content-tertiary hover:text-content-secondary"
                  }`}
                >
                  Spending limit
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetType("income")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    budgetType === "income"
                      ? "bg-positive-bg text-positive-text-strong shadow-sm"
                      : "text-content-tertiary hover:text-content-secondary"
                  }`}
                >
                  Income target
                </button>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                Categories
                <span className="ml-1.5 text-content-muted font-normal">(optional)</span>
              </label>
              {eligibleCategories.length === 0 ? (
                <p className="text-sm text-content-muted">No {budgetType} categories available.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {eligibleCategories.map((cat) => {
                    const selected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          selected
                            ? "border-transparent text-white"
                            : "border-edge-strong text-content-secondary hover:border-emerald/50"
                        }`}
                        style={selected ? { backgroundColor: cat.color_light } : {}}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedCategoryIds.length === 0 && (
                <p className="text-xs text-content-muted mt-1.5">
                  No categories selected. Budget tracks all {budgetType}s.
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="budget-name"
                className="block text-sm font-medium text-content-secondary mb-1.5"
              >
                Name
              </label>
              <input
                type="text"
                id="budget-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameWasAutoFilled(false);
                }}
                maxLength={80}
                placeholder="e.g. Wonderful Travel"
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
                required
              />
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                Period
              </label>
              <div className="flex rounded-lg bg-surface-elevated p-0.5">
                {(["weekly", "monthly", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodType(p)}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                      periodType === p
                        ? "bg-emerald text-white shadow-sm"
                        : "text-content-tertiary hover:text-content-secondary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            {periodType === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="budget-start"
                    className="block text-sm font-medium text-content-secondary mb-1.5"
                  >
                    Start date
                  </label>
                  <input
                    type="date"
                    id="budget-start"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="budget-end"
                    className="block text-sm font-medium text-content-secondary mb-1.5"
                  >
                    End date
                  </label>
                  <input
                    type="date"
                    id="budget-end"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  />
                </div>
              </div>
            )}

            {/* Amount + Currency */}
            <div>
              <label
                htmlFor="budget-amount"
                className="block text-sm font-medium text-content-secondary mb-1.5"
              >
                {budgetType === "expense" ? "Spending limit" : "Income target"}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  id="budget-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald tabular-nums"
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 px-2 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald text-sm"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-edge-default">
              {isEditMode && onDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    confirmDelete
                      ? "bg-negative-btn text-white hover:bg-negative-btn/90"
                      : "text-negative-text hover:bg-negative-bg"
                  }`}
                >
                  {confirmDelete ? "Sure? Click again" : "Delete"}
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md disabled:opacity-50"
                >
                  {isLoading ? "Saving…" : isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
