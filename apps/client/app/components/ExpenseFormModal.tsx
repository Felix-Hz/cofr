import { useState, useEffect } from "react";
import { Category } from "~/lib/utils";
import type { Expense, ExpenseCreate } from "~/lib/schemas";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseCreate) => Promise<void>;
  expense?: Expense | null;
  isLoading?: boolean;
}

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  expense,
  isLoading = false,
}: ExpenseFormModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(Category.MISCELLANEOUS);
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NZD");
  const [date, setDate] = useState("");

  const isEditMode = !!expense;

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDescription(expense.description);
      setCurrency(expense.currency);
      setDate(new Date(expense.created_at).toISOString().split("T")[0]);
    } else {
      setAmount("");
      setCategory(Category.MISCELLANEOUS);
      setDescription("");
      setCurrency("NZD");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: ExpenseCreate = {
      amount: parseFloat(amount),
      category,
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
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isEditMode ? "Edit Transaction" : "Add Transaction"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald"
              >
                {Object.values(Category).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald"
                placeholder="Optional"
              />
            </div>

            {/* Currency */}
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald"
              >
                <option value="NZD">NZD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
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
                    : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
