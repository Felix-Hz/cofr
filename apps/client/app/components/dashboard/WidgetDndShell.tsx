import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { KeyboardEvent, ReactNode } from "react";
import { widgetGridStyle } from "~/lib/dashboard/grid";
import type { DashboardWidget } from "~/lib/schemas";
import { WidgetMotionCard } from "./WidgetMotionCard";

export function WidgetDndShell({
  widget,
  layoutWidget,
  isEditMode,
  onRequestRemove,
  onResize,
  children,
}: {
  widget: DashboardWidget;
  layoutWidget?: DashboardWidget;
  isEditMode: boolean;
  onRequestRemove: () => void;
  onResize?: (action: "narrower" | "wider" | "shorter" | "taller") => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
    animateLayoutChanges: () => false,
  });

  const style = {
    ...widgetGridStyle(layoutWidget ?? widget),
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: isEditMode ? "none" : "auto",
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0 : undefined,
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      onRequestRemove();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/widget relative min-w-0 focus:outline-none"
      {...(isEditMode ? attributes : {})}
      {...(isEditMode ? listeners : {})}
      tabIndex={isEditMode ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      <WidgetMotionCard isEditMode={isEditMode} isDragging={isDragging}>
        {children}
      </WidgetMotionCard>

      {isEditMode && (
        <>
          {onResize && (
            <div className="absolute left-3 top-3 z-10 hidden items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/widget:opacity-100 group-focus-within/widget:opacity-100 sm:flex">
              {[
                { action: "narrower", label: "Make narrower", icon: "W-" },
                { action: "wider", label: "Make wider", icon: "W+" },
                { action: "shorter", label: "Make shorter", icon: "H-" },
                { action: "taller", label: "Make taller", icon: "H+" },
              ].map((control) => (
                <button
                  key={control.action}
                  type="button"
                  aria-label={control.label}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onResize(control.action as "narrower" | "wider" | "shorter" | "taller");
                  }}
                  className="inline-flex h-7 items-center justify-center rounded-sm border border-edge-default bg-surface-primary px-2 text-[10px] font-semibold tracking-[0.12em] text-content-secondary shadow-sm transition-colors hover:bg-surface-hover hover:text-content-primary"
                >
                  {control.icon}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            aria-label={`Remove ${widget.widget_type} widget`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRequestRemove();
            }}
            className="widget-remove-btn"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
