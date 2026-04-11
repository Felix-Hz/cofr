import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import { widgetGridStyle } from "~/lib/dashboard/grid";
import type { DashboardWidget } from "~/lib/schemas";
import { WidgetMotionCard } from "./WidgetMotionCard";

/**
 * Outer drag/drop layer. Owns dnd-kit transforms on its bare div; delegates
 * visual styling + enter/exit animation to WidgetMotionCard so the two layers
 * never fight for the transform CSS property.
 */
export function WidgetDndShell({
  widget,
  isEditMode,
  isHero,
  children,
}: {
  widget: DashboardWidget;
  isEditMode: boolean;
  isHero?: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
  });

  const style = {
    ...widgetGridStyle(widget),
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: isEditMode ? "none" : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-0"
      {...(isEditMode ? attributes : {})}
      {...(isEditMode ? listeners : {})}
    >
      <WidgetMotionCard isEditMode={isEditMode} isDragging={isDragging} isHero={isHero}>
        {children}
      </WidgetMotionCard>
    </div>
  );
}
