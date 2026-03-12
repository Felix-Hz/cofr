import { useEffect, useState } from "react";
import type { Category, CategoryCreate, CategoryUpdate } from "~/lib/schemas";
import CategoryColorPicker, { COLOR_PRESETS } from "./CategoryColorPicker";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryCreate | CategoryUpdate) => Promise<void>;
  category?: Category | null;
  isLoading?: boolean;
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  isLoading = false,
}: CategoryFormModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("expense");
  const [alias, setAlias] = useState("");
  const [colorLight, setColorLight] = useState(COLOR_PRESETS[0].light);
  const [colorDark, setColorDark] = useState(COLOR_PRESETS[0].dark);

  const isEditMode = !!category;

  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen resets form when modal reopens
  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setAlias(category.alias || "");
      setColorLight(category.color_light);
      setColorDark(category.color_dark);
    } else {
      setName("");
      setType("expense");
      setAlias("");
      setColorLight(COLOR_PRESETS[0].light);
      setColorDark(COLOR_PRESETS[0].dark);
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      color_light: colorLight,
      color_dark: colorDark,
      type: type as "expense" | "income" | "savings" | "investment",
      alias: alias || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isEditMode ? "Edit Category" : "Add Custom Category"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="cat-name"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Name
              </label>
              <input
                type="text"
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="cat-type"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Type
              </label>
              <select
                id="cat-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
              </select>
            </div>

            {/* Alias */}
            <div>
              <label
                htmlFor="cat-alias"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Alias (for Telegram bot)
              </label>
              <input
                type="text"
                id="cat-alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="e.g. PC"
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
              />
              <p className="text-xs text-content-tertiary mt-1">
                Short code used in the Telegram bot. Optional.
              </p>
            </div>

            {/* Color */}
            <CategoryColorPicker
              selectedLight={colorLight}
              selectedDark={colorDark}
              onSelect={(light, dark) => {
                setColorLight(light);
                setColorDark(dark);
              }}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
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
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? "Saving..." : isEditMode ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
