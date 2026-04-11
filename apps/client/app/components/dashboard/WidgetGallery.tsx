import { AnimatePresence, motion } from "motion/react";
import { springs } from "~/lib/dashboard/motion-config";
import { WIDGET_META, WIDGET_ORDER } from "~/lib/dashboard/registry";
import type { WidgetType } from "~/lib/schemas";
import { cn } from "~/lib/utils";

/**
 * Drawer listing every registered widget so the user can drop a new one onto
 * the grid. Widgets already present in the active space are marked as added.
 */
export function WidgetGallery({
  isOpen,
  onClose,
  onAdd,
  activeTypes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
  activeTypes: Set<WidgetType>;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springs.drawer}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-edge-default bg-surface-primary shadow-2xl"
            role="dialog"
            aria-label="Add widget"
          >
            <header className="flex items-center justify-between border-b border-edge-default px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-content-heading">Widget gallery</h3>
                <p className="mt-0.5 text-xs text-content-tertiary">
                  Pick a card to drop onto your dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
                aria-label="Close gallery"
              >
                <svg
                  className="mx-auto h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WIDGET_ORDER.map((type, index) => {
                  const meta = WIDGET_META[type];
                  const added = activeTypes.has(type);
                  return (
                    <motion.button
                      key={type}
                      type="button"
                      disabled={added}
                      onClick={() => onAdd(type)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springs.stagger, delay: index * 0.04 }}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                        added
                          ? "cursor-not-allowed border-edge-default bg-surface-elevated opacity-50"
                          : "border-edge-default bg-surface-elevated hover:-translate-y-0.5 hover:border-emerald/60 hover:shadow-lg",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald">
                          {meta.category}
                        </span>
                        {added && (
                          <span className="text-[10px] font-semibold text-content-tertiary">
                            Added
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-content-primary">{meta.title}</div>
                      <p className="text-xs text-content-tertiary">{meta.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
