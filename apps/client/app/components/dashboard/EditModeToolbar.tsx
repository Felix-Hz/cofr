import { AnimatePresence, motion } from "motion/react";
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
  isDirty,
  isSaving,
}: {
  isEditMode: boolean;
  onExit: () => void;
  onOpenGallery: () => void;
  isDirty: boolean;
  isSaving: boolean;
}) {
  return (
    <AnimatePresence>
      {isEditMode && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={springs.toolbar}
          className="edit-toolbar fixed inset-x-0 bottom-6 z-40 mx-auto flex w-max items-center gap-2 px-4 py-2 pointer-events-auto"
          role="toolbar"
          aria-label="Dashboard edit controls"
        >
          <button
            type="button"
            onClick={onOpenGallery}
            className="flex h-9 items-center gap-1.5 rounded-full bg-emerald px-4 text-xs font-medium text-white transition-colors hover:bg-emerald-hover"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add widget
          </button>

          <div className="h-5 w-px bg-edge-default" aria-hidden />

          <span className="hidden px-2 text-[11px] text-content-tertiary sm:inline">
            {isSaving ? "Saving…" : isDirty ? "Unsaved changes" : "All changes saved"}
          </span>

          <button
            type="button"
            onClick={onExit}
            className="flex h-9 items-center rounded-full border border-edge-strong bg-surface-primary px-4 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover"
          >
            Done
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
