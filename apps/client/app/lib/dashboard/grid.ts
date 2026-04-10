import type { DashboardWidget, WidgetType } from "../schemas";
import { clampWidgetSize, type DefaultLayoutWidget } from "./registry";

export const GRID_COLUMNS = 12;

/**
 * Pack widgets into non-overlapping rows on a 12-column grid.
 * Called after drag/drop so we never persist overlapping layouts.
 * Widgets preserve their relative order and are placed left-to-right.
 */
export function repackWidgets<
  T extends {
    widget_type: WidgetType;
    col_span: number;
    row_span: number;
    col_x: number;
    col_y: number;
  },
>(widgets: T[]): T[] {
  const sorted = [...widgets].sort((a, b) => a.col_y - b.col_y || a.col_x - b.col_x);
  const rowMap = new Map<number, number>();
  const packed: T[] = [];

  let cursorY = 0;
  let cursorX = 0;

  for (const widget of sorted) {
    const { colSpan, rowSpan } = clampWidgetSize(
      widget.widget_type,
      widget.col_span,
      widget.row_span,
    );

    if (cursorX + colSpan > GRID_COLUMNS) {
      cursorY = Math.max(cursorY + 1, nextFreeRow(rowMap, cursorY));
      cursorX = 0;
    }

    packed.push({
      ...widget,
      col_x: cursorX,
      col_y: cursorY,
      col_span: colSpan,
      row_span: rowSpan,
    });

    for (let dy = 0; dy < rowSpan; dy++) {
      const y = cursorY + dy;
      rowMap.set(y, Math.max(rowMap.get(y) ?? 0, cursorX + colSpan));
    }

    cursorX += colSpan;
    if (cursorX >= GRID_COLUMNS) {
      cursorY += 1;
      cursorX = 0;
    }
  }

  return packed;
}

function nextFreeRow(rowMap: Map<number, number>, from: number): number {
  let y = from;
  while ((rowMap.get(y) ?? 0) >= GRID_COLUMNS) y += 1;
  return y;
}

export function widgetGridStyle(
  widget: DashboardWidget | DefaultLayoutWidget,
): React.CSSProperties {
  return {
    gridColumn: `${widget.col_x + 1} / span ${widget.col_span}`,
    gridRow: `${widget.col_y + 1} / span ${widget.row_span}`,
  };
}

/**
 * Total number of rows in a layout (for CSS Grid `grid-template-rows`).
 */
export function layoutRowCount(widgets: Array<DashboardWidget | DefaultLayoutWidget>): number {
  let max = 0;
  for (const w of widgets) {
    max = Math.max(max, w.col_y + w.row_span);
  }
  return Math.max(max, 1);
}
