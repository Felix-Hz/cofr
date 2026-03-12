import { useEffect, useState } from "react";
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
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NZD");
  const [date, setDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!expense;

  // Default to first active category or Miscellaneous
  const defaultCategoryId =
    activeCategories.find((c) => c.slug === "miscellaneous")?.id || activeCategories[0]?.id || "";

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategoryId(expense.category_id);
      setDescription(expense.description);
      setCurrency(expense.currency);
      setShowDeleteConfirm(false);
      const d = new Date(expense.created_at);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setAmount("");
      setCategoryId(defaultCategoryId);
      setDescription("");
      setCurrency("NZD");
      setShowDeleteConfirm(false);
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    }
  }, [expense, isOpen, defaultCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: ExpenseCreate = {
      amount: parseFloat(amount),
      category_id: categoryId,
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
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isEditMode ? "Edit Transaction" : "Add Transaction"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-content-secondary mb-1"
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
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
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
                htmlFor="currency"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Currency
              </label>
              <select
                id="currency"
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
                htmlFor="date"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Date
              </label>
              <input
                type="datetime-local"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
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
                  {isLoading ? "Saving..." : isEditMode ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
