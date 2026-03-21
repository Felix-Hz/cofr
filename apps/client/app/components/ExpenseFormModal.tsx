import { useEffect, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useAccounts } from "~/lib/accounts";
import { useCategories } from "~/lib/categories";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import type { Expense, ExpenseCreate } from "~/lib/schemas";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseCreate) => Promise<void>;
  onDelete?: () => Promise<void>;
  expense?: Expense | null;
  isLoading?: boolean;
}

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  expense,
  isLoading = false,
}: ExpenseFormModalProps) {
  const { activeCategories } = useCategories();
  const { accounts } = useAccounts();
  const [mode, setMode] = useState<"expense" | "fund">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NZD");
  const [date, setDate] = useState("");
  const [isOpeningBalance, setIsOpeningBalance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!expense;

  const filteredCategories = activeCategories.filter((c) =>
    mode === "fund" ? c.type === "income" : c.type === "expense",
  );

  // Default to first active category or Miscellaneous
  const defaultExpenseCategoryId =
    activeCategories.find((c) => c.slug === "miscellaneous")?.id ||
    activeCategories.find((c) => c.type === "expense")?.id ||
    "";
  const defaultFundCategoryId = activeCategories.find((c) => c.type === "income")?.id || "";

  const storedDefaultAccountId =
    typeof window !== "undefined" ? localStorage.getItem("cofr_default_account_id") : null;
  const defaultAccountId =
    accounts.find((account) => account.id === storedDefaultAccountId)?.id || accounts[0]?.id || "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen resets form when modal reopens
  useEffect(() => {
    if (expense) {
      const derivedMode = expense.category_type === "income" ? "fund" : "expense";
      setMode(derivedMode);
      setAmount(expense.amount.toString());
      setCategoryId(expense.category_id || defaultExpenseCategoryId);
      setAccountId(expense.account_id || defaultAccountId);
      setDescription(expense.description);
      setCurrency(expense.currency);
      setIsOpeningBalance(expense.is_opening_balance);
      setShowDeleteConfirm(false);
      const d = new Date(expense.created_at);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setMode("expense");
      setAmount("");
      setCategoryId(defaultExpenseCategoryId);
      setAccountId(defaultAccountId);
      setDescription("");
      setCurrency("NZD");
      setIsOpeningBalance(false);
      setShowDeleteConfirm(false);
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    }
  }, [expense, isOpen, defaultExpenseCategoryId, defaultFundCategoryId, defaultAccountId]);

  const handleModeSwitch = (newMode: "expense" | "fund") => {
    if (newMode === mode) return;
    setMode(newMode);
    setCategoryId(newMode === "fund" ? defaultFundCategoryId : defaultExpenseCategoryId);
    if (newMode === "expense") setIsOpeningBalance(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: ExpenseCreate = {
      amount: parseFloat(amount),
      category_id: categoryId,
      description,
      currency,
      created_at: date ? new Date(date) : undefined,
      is_opening_balance: isOpeningBalance,
      account_id: accountId || undefined,
    };

    await onSubmit(data);
  };

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[85vh] flex flex-col overflow-hidden">
          <h3 className="hidden sm:block text-lg font-semibold mb-3 shrink-0">
            {isEditMode
              ? mode === "fund"
                ? "Edit Funding"
                : "Edit Expense"
              : mode === "fund"
                ? "Fund Account"
                : "Add Expense"}
          </h3>

          {/* Expense / Fund toggle */}
          <div className="flex rounded-lg bg-surface-elevated p-0.5 mb-3 sm:mb-4 shrink-0">
            <button
              type="button"
              onClick={() => handleModeSwitch("expense")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "expense"
                  ? "bg-emerald text-white shadow-sm"
                  : "text-content-tertiary hover:text-content-secondary"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("fund")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "fund"
                  ? "bg-positive-bg text-positive-text-strong shadow-sm"
                  : "text-content-tertiary hover:text-content-secondary"
              }`}
            >
              Fund Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto overflow-x-hidden overscroll-contain touch-auto flex-1 min-h-0 space-y-2 sm:space-y-4 px-0.5">
              {/* Account */}
              {accounts.length > 0 && (
                <div>
                  <label
                    htmlFor="account"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    {mode === "fund" ? "Into Account" : "From Account"}
                  </label>
                  <select
                    id="account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    {accounts.map((acct) => (
                      <option key={acct.id} value={acct.id}>
                        {acct.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount + Currency */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="amount"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Amount
                  </label>
                  <input
                    type="number"
                    id="amount"
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
                    htmlFor="currency"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category — hidden in fund mode */}
              {mode === "expense" && (
                <div>
                  <label
                    htmlFor="category"
                    className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                >
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={360}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  placeholder="Optional"
                />
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-xs sm:text-sm font-medium text-content-secondary mb-0.5 sm:mb-1"
                >
                  Date
                </label>
                <input
                  type="datetime-local"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                />
              </div>

              {/* Opening Balance */}
              {mode === "fund" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOpeningBalance}
                    onChange={(e) => setIsOpeningBalance(e.target.checked)}
                    className="w-4 h-4 rounded border-edge-strong text-emerald focus:ring-emerald accent-emerald"
                  />
                  <span className="text-sm text-content-secondary">
                    Opening balance
                    <span className="text-content-tertiary"> — excluded from stats</span>
                  </span>
                </label>
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
                          onDelete();
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
                  {isLoading
                    ? "Saving..."
                    : isEditMode
                      ? "Update"
                      : mode === "fund"
                        ? "Fund"
                        : "Add Expense"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
