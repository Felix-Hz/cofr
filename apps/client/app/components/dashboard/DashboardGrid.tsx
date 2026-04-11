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
import { useMemo, useState } from "react";
import { GRID_COLUMNS, layoutRowCount, repackWidgets, widgetGridStyle } from "~/lib/dashboard/grid";
import { springs } from "~/lib/dashboard/motion-config";
import { getRegistry } from "~/lib/dashboard/registry";
import type { DashboardWidget } from "~/lib/schemas";
import { WidgetDndShell } from "./WidgetDndShell";
import { WidgetMotionCard } from "./WidgetMotionCard";

const HERO_TYPES = new Set(["net_worth", "period_stats_4up"]);

/**
 * Top-level grid runtime. Owns the DndContext so dnd-kit sensors are only
 * active while the user is editing, and owns the layout animation wrapper
 * that gives widgets their iOS-style reflow.
 */
export function DashboardGrid({
  widgets,
  isEditMode,
  onReorder,
}: {
  widgets: DashboardWidget[];
  isEditMode: boolean;
  onReorder: (next: DashboardWidget[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const registry = getRegistry();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const orderedIds = useMemo(() => widgets.map((w) => w.id), [widgets]);
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;
  const rowCount = layoutRowCount(widgets);

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
    gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
    gridAutoRows: "minmax(96px, auto)",
    gridTemplateRows: `repeat(${rowCount}, minmax(96px, auto))`,
    gap: "1rem",
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
        <motion.div
          layout
          transition={springs.layout}
          style={gridStyle}
          className="dashboard-ambient"
        >
          <AnimatePresence initial={false}>
            {widgets.map((widget, index) => {
              const def = registry[widget.widget_type];
              if (!def) return null;
              const Component = def.Component;
              return (
                <motion.div
                  key={widget.id}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { ...springs.stagger, delay: index * 0.035 },
                  }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                  style={{ display: "contents" }}
                >
                  <WidgetDndShell
                    widget={widget}
                    isEditMode={isEditMode}
                    isHero={HERO_TYPES.has(widget.widget_type)}
                  >
                    <Component widget={widget} isEditMode={isEditMode} />
                  </WidgetDndShell>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {activeWidget
          ? (() => {
              const def = registry[activeWidget.widget_type];
              if (!def) return null;
              const Component = def.Component;
              return (
                <div style={widgetGridStyle(activeWidget)}>
                  <WidgetMotionCard
                    isEditMode
                    isDragging
                    isHero={HERO_TYPES.has(activeWidget.widget_type)}
                  >
                    <Component widget={activeWidget} isEditMode />
                  </WidgetMotionCard>
                </div>
              );
            })()
          : null}
      </DragOverlay>
    </DndContext>
  );
}
