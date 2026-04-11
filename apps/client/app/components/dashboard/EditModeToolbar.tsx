import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { springs } from "~/lib/dashboard/motion-config";

/**
 * Floating pill-shaped toolbar shown while the dashboard is in edit mode.
 * Sits above everything via fixed positioning so it never fights the grid
 * layout and stays thumb-reachable on mobile.
 */
export function EditModeToolbar({
  isEditMode,
  onExit,
  onOpenGallery,
  onSave,
  onDiscard,
  isDirty,
  isSaving,
  error,
}: {
  isEditMode: boolean;
  onExit: () => void;
  onOpenGallery: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isDirty: boolean;
  isSaving: boolean;
  error?: string | null;
}) {
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      event.preventDefault();
      if (isSaving) return;
      if (isDirty) {
        onSave();
        return;
      }
      onExit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, isEditMode, isSaving, onExit, onSave]);

  return (
    <AnimatePresence>
      {isEditMode && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={springs.toolbar}
          className="edit-toolbar fixed inset-x-0 bottom-3 z-40 mx-auto w-[min(calc(100%-1rem),40rem)] pointer-events-auto sm:bottom-6"
          role="toolbar"
          aria-label="Dashboard edit controls"
        >
          <div className="rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary px-3 py-3 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.28)] sm:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
                  Edit dashboard
                </div>
                <div className="mt-1 truncate text-[13px] text-content-secondary">
                  {error
                    ? error
                    : isSaving
                      ? "Saving changes"
                      : isDirty
                        ? "Draft changes ready"
                        : "All changes saved"}
                </div>
              </div>

              {isDirty && (
                <button
                  type="button"
                  onClick={onDiscard}
                  disabled={isSaving}
                  className="shrink-0 text-[12px] font-medium text-content-tertiary transition-colors hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenGallery}
                className="flex h-11 items-center justify-center gap-2 rounded-md border border-edge-default bg-surface-elevated text-sm font-medium text-content-primary transition-colors hover:bg-surface-hover"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add widget
              </button>

              <button
                type="button"
                onClick={isDirty ? onSave : onExit}
                disabled={isSaving}
                className={`flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDirty
                    ? "bg-emerald text-white hover:bg-emerald-hover"
                    : "border border-edge-strong bg-surface-primary text-content-primary hover:bg-surface-hover"
                }`}
              >
                {isSaving ? "Saving..." : isDirty ? "Save changes" : "Done"}
              </button>
            </div>
          </div>

          <div className="hidden items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary px-4 py-3 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.28)] sm:flex">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpenGallery}
                className="flex h-10 items-center gap-2 rounded-md bg-emerald px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-hover"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add widget
              </button>

              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
                  Edit mode
                </div>
                <div className="truncate text-sm text-content-secondary">
                  {error
                    ? error
                    : isSaving
                      ? "Saving changes"
                      : isDirty
                        ? "Draft changes ready to save"
                        : "All changes saved"}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isDirty && (
                <button
                  type="button"
                  onClick={onDiscard}
                  disabled={isSaving}
                  className="flex h-10 items-center rounded-md border border-edge-default bg-surface-primary px-4 text-sm font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard
                </button>
              )}

              <button
                type="button"
                onClick={isDirty ? onSave : onExit}
                disabled={isSaving}
                className={`flex h-10 items-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDirty
                    ? "bg-emerald text-white hover:bg-emerald-hover"
                    : "border border-edge-strong bg-surface-primary text-content-primary hover:bg-surface-hover"
                }`}
              >
                {isSaving ? "Saving..." : isDirty ? "Save changes" : "Done"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
