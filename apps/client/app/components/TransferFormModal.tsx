import { useEffect, useState } from "react";
import { useAccounts } from "~/lib/accounts";
import { getAccountBalances } from "~/lib/api";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import type { AccountBalance, Expense, TransferCreate } from "~/lib/schemas";
import { formatCurrency } from "~/lib/utils";

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransferCreate) => Promise<void>;
  onDelete?: () => Promise<void>;
  expense?: Expense | null;
  isLoading?: boolean;
}

export default function TransferFormModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  expense,
  isLoading = false,
}: TransferFormModalProps) {
  const { accounts } = useAccounts();
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NZD");
  const [date, setDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!expense;
  const sameAccountError = fromAccountId && toAccountId && fromAccountId === toAccountId;
  const storedDefaultAccountId =
    typeof window !== "undefined" ? localStorage.getItem("cofr_default_account_id") : null;
  const defaultFromAccountId =
    accounts.find((account) => account.id === storedDefaultAccountId)?.id || accounts[0]?.id || "";
  const defaultToAccountId =
    accounts.find((account) => account.id !== defaultFromAccountId)?.id || "";

  // Fetch account balances when modal opens
  useEffect(() => {
    if (isOpen) {
      getAccountBalances()
        .then(setAccountBalances)
        .catch(() => {});
    }
  }, [isOpen]);

  // Compute negative balance warning
  const fromBalance = accountBalances.find((b) => b.account_id === fromAccountId);
  const parsedAmount = parseFloat(amount);
  const resultingBalance = fromBalance
    ? fromBalance.balance - (Number.isNaN(parsedAmount) ? 0 : parsedAmount)
    : null;
  const negativeBalanceWarning =
    resultingBalance !== null &&
    resultingBalance < 0 &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0;
  const fromAccountName = accounts.find((a) => a.id === fromAccountId)?.name || "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen resets form
  useEffect(() => {
    if (expense) {
      // Edit mode: expense is the 'from' side of the transfer
      setFromAccountId(expense.account_id);
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setCurrency(expense.currency);
      setShowDeleteConfirm(false);
      const d = new Date(expense.created_at);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
      // We need to figure out the 'to' account from the description pattern or linked tx
      // The description shows "AccountA -> AccountB", parse it if possible
      // For now, we'll need the linked tx's account_name. We store the to account from the description.
      setToAccountId("");
    } else {
      setFromAccountId(defaultFromAccountId);
      setToAccountId(defaultToAccountId);
      setAmount("");
      setDescription("");
      setCurrency("NZD");
      setShowDeleteConfirm(false);
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    }
  }, [expense, isOpen, defaultFromAccountId, defaultToAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sameAccountError) return;

    const data: TransferCreate = {
      amount: parseFloat(amount),
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      description,
      currency,
      created_at: date ? new Date(date) : undefined,
    };

    await onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[85vh] flex flex-col">
          <h3 className="text-lg font-semibold text-content-primary mb-4 shrink-0">
            {isEditMode ? "Edit Transfer" : "New Transfer"}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 min-h-0 space-y-3 sm:space-y-4 px-0.5">
              {/* From / To accounts */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="from-account"
                    className="block text-xs font-medium text-content-secondary mb-1"
                  >
                    From
                  </label>
                  <select
                    id="from-account"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  >
                    <option value="" disabled>
                      Select account
                    </option>
                    {accounts.map((acct) => (
                      <option key={acct.id} value={acct.id}>
                        {acct.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrow icon */}
                <div className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-accent-soft-bg text-accent-soft-text shrink-0 self-center mt-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="to-account"
                    className="block text-xs font-medium text-content-secondary mb-1"
                  >
                    To
                  </label>
                  <select
                    id="to-account"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    required
                  >
                    <option value="" disabled>
                      Select account
                    </option>
                    {accounts.map((acct) => (
                      <option key={acct.id} value={acct.id}>
                        {acct.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {sameAccountError && (
                <p className="text-xs text-warning-text">Cannot transfer to the same account</p>
              )}

              {negativeBalanceWarning && !sameAccountError && (
                <p className="text-xs text-warning-text">
                  This will leave {fromAccountName} with a negative balance of{" "}
                  {formatCurrency(resultingBalance as number, currency)}
                </p>
              )}

              {/* Amount */}
              <div>
                <label
                  htmlFor="transfer-amount"
                  className="block text-sm font-medium text-content-secondary mb-1"
                >
                  Amount
                </label>
                <input
                  type="number"
                  id="transfer-amount"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="transfer-description"
                  className="block text-sm font-medium text-content-secondary mb-1"
                >
                  Description
                </label>
                <textarea
                  id="transfer-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={360}
                  rows={2}
                  className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald resize-none"
                  placeholder="Optional"
                />
                <p className="text-xs text-content-tertiary text-right mt-1">
                  {description.length}/360
                </p>
              </div>

              {/* Currency */}
              <div>
                <label
                  htmlFor="transfer-currency"
                  className="block text-sm font-medium text-content-secondary mb-1"
                >
                  Currency
                </label>
                <select
                  id="transfer-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="transfer-date"
                  className="block text-sm font-medium text-content-secondary mb-1"
                >
                  Date
                </label>
                <input
                  type="datetime-local"
                  id="transfer-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                />
              </div>
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
                  disabled={isLoading || !!sameAccountError}
                >
                  {isLoading ? "Saving..." : isEditMode ? "Save Changes" : "Transfer"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
