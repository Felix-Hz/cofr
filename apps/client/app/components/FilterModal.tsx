import { Category } from "~/lib/utils";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  category: string;
  setCategory: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  hasActiveFilters: boolean;
}

export default function FilterModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  category,
  setCategory,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  hasActiveFilters,
}: FilterModalProps) {
  if (!isOpen) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">Filter Transactions</h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="category-filter"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-edge-strong rounded-md text-sm bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
              >
                <option value="">All Categories</option>
                {Object.values(Category).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Amount Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-edge-strong rounded-md text-sm bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald tabular-nums"
                />
                <span className="text-content-tertiary text-sm">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-edge-strong rounded-md text-sm bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6">
            <div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-negative-text hover:text-negative-text-strong"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
