import { AnimatePresence, motion } from "motion/react";
import { useModalKeyboardShortcuts } from "~/hooks/useModalKeyboardShortcuts";
import { springs } from "~/lib/dashboard/motion-config";
import { WIDGET_META, WIDGET_ORDER } from "~/lib/dashboard/registry";
import type { WidgetCategory } from "~/lib/dashboard/widget-defs";
import type { WidgetType } from "~/lib/schemas";
import { cn } from "~/lib/utils";

const CATEGORY_ORDER: WidgetCategory[] = ["period", "wealth", "insights", "activity"];

const CATEGORY_COPY: Record<WidgetCategory, { title: string; description: string }> = {
  period: {
    title: "Period",
    description: "Cards tied to the selected date range and current reporting window.",
  },
  wealth: {
    title: "Wealth",
    description: "Balances, net worth, and account-level trajectory.",
  },
  insights: {
    title: "Insights",
    description: "Breakdowns, comparisons, and trend views across your data.",
  },
  activity: {
    title: "Activity",
    description: "Recurring behaviour and transaction-level monitoring.",
  },
};

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
  useModalKeyboardShortcuts({ isOpen, onEscape: onClose });

  const groupedWidgets = CATEGORY_ORDER.map((category) => ({
    category,
    meta: CATEGORY_COPY[category],
    widgets: WIDGET_ORDER.filter((type) => WIDGET_META[type].category === category),
  })).filter((section) => section.widgets.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed -inset-8 z-[60] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={springs.drawer}
            className="fixed right-4 top-4 z-[61] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary shadow-2xl"
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
                className="h-8 w-8 rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
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

            <div className="min-h-0 overflow-y-auto p-4">
              <div className="space-y-5">
                {groupedWidgets.map((section) => (
                  <section key={section.category} className="space-y-2.5">
                    <div className="border-b border-edge-default/80 pb-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-secondary">
                        {section.meta.title}
                      </h4>
                      <p className="mt-1 text-xs text-content-tertiary">
                        {section.meta.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {section.widgets.map((type) => {
                        const meta = WIDGET_META[type];
                        const added = activeTypes.has(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={added}
                            onClick={() => onAdd(type)}
                            className={cn(
                              "flex flex-col gap-1.5 rounded-md border p-4 text-left transition-all",
                              added
                                ? "cursor-not-allowed border-edge-default bg-surface-elevated opacity-50"
                                : "border-edge-default bg-surface-elevated hover:border-emerald/60 hover:shadow-lg",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald">
                                {section.meta.title}
                              </span>
                              {added && (
                                <span className="text-[10px] font-semibold text-content-tertiary">
                                  Added
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-content-primary">
                              {meta.title}
                            </div>
                            <p className="text-xs text-content-tertiary">{meta.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
            <footer className="border-t border-edge-default bg-surface-primary px-5 py-3 text-[11px] text-content-tertiary">
              Tap a card to add it. Drag widgets on the dashboard to reorder.
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
