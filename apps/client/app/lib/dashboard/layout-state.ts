import type { DashboardLayoutUpdate, DashboardSpace, DashboardWidget } from "../schemas";
import { repackWidgets } from "./grid";
import { clampWidgetSize } from "./registry";

function cloneWidget(widget: DashboardWidget): DashboardWidget {
  const nextSize = clampWidgetSize(widget.widget_type, widget.col_span, widget.row_span);
  return {
    ...widget,
    col_span: nextSize.colSpan,
    row_span: nextSize.rowSpan,
    config: widget.config ?? null,
  };
}

export function cloneDashboardSpaces(spaces: DashboardSpace[]): DashboardSpace[] {
  return spaces.map((space) => ({
    ...space,
    widgets: repackWidgets(space.widgets.map(cloneWidget)),
  }));
}

export function normalizeDashboardSpaces(
  spaces: DashboardSpace[],
  preferredDefaultId?: string | null,
): DashboardSpace[] {
  const cloned = cloneDashboardSpaces(spaces).map((space, index) => ({
    ...space,
    position: index,
  }));

  const defaultId =
    (preferredDefaultId && cloned.some((space) => space.id === preferredDefaultId)
      ? preferredDefaultId
      : null) ??
    cloned.find((space) => space.is_default)?.id ??
    cloned[0]?.id ??
    null;

  return cloned.map((space) => ({
    ...space,
    is_default: space.id === defaultId,
  }));
}

export function createDashboardSpace(spaces: DashboardSpace[], id: string): DashboardSpace {
  const takenNames = new Set(spaces.map((space) => space.name));
  let index = spaces.length + 1;
  let name = `Space ${index}`;
  while (takenNames.has(name)) {
    index += 1;
    name = `Space ${index}`;
  }

  return {
    id,
    name,
    position: spaces.length,
    is_default: spaces.length === 0,
    widgets: [],
  };
}

export function removeDashboardSpace(spaces: DashboardSpace[], id: string): DashboardSpace[] {
  const filtered = spaces.filter((space) => space.id !== id);
  if (filtered.length === 0) return filtered;
  const nextDefaultId = filtered.find((space) => space.is_default)?.id ?? filtered[0].id;
  return normalizeDashboardSpaces(filtered, nextDefaultId);
}

export function buildDashboardLayoutUpdate(spaces: DashboardSpace[]): DashboardLayoutUpdate {
  const normalized = normalizeDashboardSpaces(spaces);
  return {
    spaces: normalized.map((space, index) => ({
      id: space.id,
      name: space.name.trim() || `Space ${index + 1}`,
      position: index,
      is_default: space.is_default,
      widgets: space.widgets.map((widget) => ({
        widget_type: widget.widget_type,
        col_x: widget.col_x,
        col_y: widget.col_y,
        col_span: widget.col_span,
        row_span: widget.row_span,
        config: widget.config ?? null,
      })),
    })),
  };
}
