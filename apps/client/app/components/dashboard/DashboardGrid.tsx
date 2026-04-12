import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  GRID_COLUMNS,
  getMobileRowSpan,
  layoutRowCount,
  MOBILE_GRID_COLUMNS,
  repackWidgets,
  repackWidgetsForColumns,
  widgetGridStyle,
} from "~/lib/dashboard/grid";
import { durations, EASE_OUT_EXPO } from "~/lib/dashboard/motion-config";
import { getRegistry, WIDGET_ORDER } from "~/lib/dashboard/registry";
import type { DashboardWidget } from "~/lib/schemas";
import { WidgetDndShell } from "./WidgetDndShell";
import { WidgetMotionCard } from "./WidgetMotionCard";

export function DashboardGrid({
  widgets,
  isEditMode,
  onReorder,
  onRequestRemove,
  onResize,
  onOpenGallery,
}: {
  widgets: DashboardWidget[];
  isEditMode: boolean;
  onReorder: (next: DashboardWidget[]) => void;
  onRequestRemove: (widget: DashboardWidget) => void;
  onResize: (widget: DashboardWidget, action: "narrower" | "wider" | "shorter" | "taller") => void;
  onOpenGallery: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const registry = getRegistry();
  const widgetCount = WIDGET_ORDER.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const orderedIds = useMemo(() => widgets.map((w) => w.id), [widgets]);
  const displayWidgets = useMemo(() => {
    if (!isMobileGrid) return widgets;
    return repackWidgetsForColumns(
      widgets.map((widget) => ({
        ...widget,
        col_x: 0,
        col_y: 0,
        col_span: MOBILE_GRID_COLUMNS,
        row_span: getMobileRowSpan(widget.widget_type, widget.row_span),
      })),
      MOBILE_GRID_COLUMNS,
    );
  }, [isMobileGrid, widgets]);
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;
  const activeDisplayWidget = activeId ? displayWidgets.find((w) => w.id === activeId) : null;
  const rowCount = layoutRowCount(displayWidgets);
  const renderColumns = isMobileGrid ? MOBILE_GRID_COLUMNS : GRID_COLUMNS;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobileGrid(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...widgets];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(repackWidgets(next));
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${renderColumns}, minmax(0, 1fr))`,
    gridAutoRows: isMobileGrid ? "84px" : "96px",
    gridTemplateRows: `repeat(${rowCount}, ${isMobileGrid ? 84 : 96}px)`,
    gap: isMobileGrid ? "0.875rem" : "1rem",
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className="relative">
          <AnimatePresence>
            {activeId && (
              <motion.div
                key="drag-grid-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={gridStyle}
                className="drag-grid-overlay pointer-events-none absolute inset-0"
                aria-hidden
              >
                {Array.from({ length: renderColumns * rowCount }, (_, i) => {
                  const row = Math.floor(i / renderColumns);
                  const col = i % renderColumns;
                  return <div key={`r${row}c${col}`} className="drag-grid-cell" />;
                })}
              </motion.div>
            )}
          </AnimatePresence>
          {widgets.length === 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durations.medium, ease: EASE_OUT_EXPO }}
              className="dashboard-ambient relative overflow-hidden rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary px-6 py-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10"
            >
              <div className="relative flex flex-col gap-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center rounded-full bg-accent-soft-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-soft-text">
                      Dashboard layout
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-content-heading sm:text-3xl">
                      No widgets added yet
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-content-secondary sm:text-[15px]">
                      Build this space with the metrics and tables you actually check. Start with a
                      period summary, then add detail only where it helps you decide.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={onOpenGallery}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald px-5 text-sm font-medium text-white transition-[background-color] duration-200 hover:bg-emerald-hover"
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
                      Add first widget
                    </button>
                    <div className="inline-flex h-11 items-center justify-center rounded-md border border-edge-default bg-surface-elevated px-4 text-sm text-content-tertiary">
                      {widgetCount} widget types available
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.medium, delay: 0.08, ease: EASE_OUT_EXPO }}
                  className="rounded-[var(--radius-lg)] border border-edge-default bg-surface-elevated p-5"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft-text">
                    Suggested starting set
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        title: "Period Stats",
                        detail: "Anchor the page with income, spend, net, and savings rate.",
                      },
                      {
                        title: "Category breakdown",
                        detail: "Add one insight view to explain where spend is moving.",
                      },
                      {
                        title: "Transactions",
                        detail: "Keep a working list for edits and spot checks.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-3 border-b border-edge-default/70 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
                        <div>
                          <div className="text-sm font-semibold text-content-heading">
                            {item.title}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-content-secondary">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.section>
          ) : (
            <div style={gridStyle} className="dashboard-ambient relative">
              {widgets.map((widget) => {
                const def = registry[widget.widget_type];
                if (!def) return null;
                const Component = def.Component;
                const layoutWidget = displayWidgets.find((item) => item.id === widget.id) ?? widget;
                return (
                  <WidgetDndShell
                    key={widget.id}
                    widget={widget}
                    layoutWidget={layoutWidget}
                    isEditMode={isEditMode}
                    onRequestRemove={() => onRequestRemove(widget)}
                    onResize={isMobileGrid ? undefined : (action) => onResize(widget, action)}
                  >
                    <Component widget={layoutWidget} isEditMode={isEditMode} />
                  </WidgetDndShell>
                );
              })}
            </div>
          )}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {activeWidget
          ? (() => {
              const def = registry[activeWidget.widget_type];
              if (!def) return null;
              const Component = def.Component;
              return (
                <div style={widgetGridStyle(activeDisplayWidget ?? activeWidget)}>
                  <WidgetMotionCard isEditMode isDragging>
                    <Component widget={activeDisplayWidget ?? activeWidget} isEditMode />
                  </WidgetMotionCard>
                </div>
              );
            })()
          : null}
      </DragOverlay>
    </DndContext>
  );
}
