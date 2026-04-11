import { useEffect, useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import type { Category, CategoryCreate, CategoryUpdate } from "~/lib/schemas";
import CategoryColorPicker, { COLOR_PRESETS } from "./CategoryColorPicker";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryCreate | CategoryUpdate) => Promise<void>;
  category?: Category | null;
  isLoading?: boolean;
  categories?: Category[];
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  isLoading = false,
  categories,
}: CategoryFormModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("expense");
  const [alias, setAlias] = useState("");
  const [colorLight, setColorLight] = useState(COLOR_PRESETS[0].light);
  const [colorDark, setColorDark] = useState(COLOR_PRESETS[0].dark);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!category;

  // Other categories (excluding current one when editing)
  const otherCategories = (categories ?? []).filter((c) => !category || c.id !== category.id);

  // Client-side uniqueness checks
  const nameConflict = name.trim()
    ? otherCategories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())
    : false;

  const aliasConflict = alias.trim()
    ? otherCategories.some((c) => c.alias && c.alias.toLowerCase() === alias.trim().toLowerCase())
    : false;

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
    setError(null);
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        name,
        color_light: colorLight,
        color_dark: colorDark,
        type: type as "expense" | "income",
        alias: alias || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  useBodyScrollLock(isOpen);
  useModalKeyboardShortcuts({ isOpen, onEscape: onClose });

  if (!isOpen) return null;

  const canSubmit = !isLoading && name.trim() && !nameConflict && !aliasConflict;

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isEditMode ? "Edit Category" : "Add Custom Category"}
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
                className={`w-full px-3 py-2 border rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald ${
                  nameConflict ? "border-warning-text" : "border-edge-strong"
                }`}
                required
              />
              {nameConflict && (
                <p className="flex items-center gap-1 text-xs text-warning-text mt-1.5">
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  A category with this name already exists
                </p>
              )}
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
              </select>
            </div>

            {/* Alias */}
            <div>
              <label
                htmlFor="cat-alias"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Alias
              </label>
              <input
                type="text"
                id="cat-alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="e.g. PC"
                className={`w-full px-3 py-2 border rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald ${
                  aliasConflict ? "border-warning-text" : "border-edge-strong"
                }`}
              />
              {aliasConflict ? (
                <p className="flex items-center gap-1 text-xs text-warning-text mt-1.5">
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  This alias is already in use
                </p>
              ) : (
                <p className="text-xs text-content-tertiary mt-1">
                  Optional short code for this category.
                </p>
              )}
            </div>

            {/* Color */}
            <CategoryColorPicker
              selectedLight={colorLight}
              selectedDark={colorDark}
              onSelect={(light, dark) => {
                setColorLight(light);
                setColorDark(dark);
              }}
              usedColors={otherCategories.map((c) => ({
                light: c.color_light,
                dark: c.color_dark,
                categoryName: c.name,
              }))}
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
                disabled={!canSubmit}
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
