import type { DashboardWidget, WidgetType } from "../schemas";
import { clampWidgetSize, type DefaultLayoutWidget } from "./registry";

export const GRID_COLUMNS = 12;
export const MOBILE_GRID_COLUMNS = 6;

const MOBILE_ROW_SPANS: Partial<Record<WidgetType, number>> = {
  period_stats_4up: 2,
  stat_income: 1,
  stat_spent: 1,
  stat_net: 1,
  stat_savings_rate: 1,
  net_worth: 1,
  savings_investment: 2,
  account_balances: 2,
  category_pie: 3,
  spend_sparkline: 1,
  transactions: 4,
};

/**
 * Pack widgets into non-overlapping positions on a 12-column grid.
 *
 * Walks the grid row-by-row, left-to-right, and places each widget at the
 * first slot where every cell its `col_span` x `row_span` footprint covers
 * is free. This correctly handles multi-row widgets blocking subsequent
 * placements, which the previous cursor-based packer did not.
 *
 * Input order is preserved so the caller's intent (post-splice from a drag
 * reorder, or an append from the gallery) drives placement.
 */
export function repackWidgetsForColumns<
  T extends {
    widget_type: WidgetType;
    col_span: number;
    row_span: number;
    col_x: number;
    col_y: number;
  },
>(widgets: T[], columns: number): T[] {
  const occupied: boolean[][] = [];
  const packed: T[] = [];

  const fits = (x: number, y: number, colSpan: number, rowSpan: number): boolean => {
    if (x + colSpan > columns) return false;
    for (let dy = 0; dy < rowSpan; dy++) {
      const row = occupied[y + dy];
      if (!row) continue;
      for (let dx = 0; dx < colSpan; dx++) {
        if (row[x + dx]) return false;
      }
    }
    return true;
  };

  const mark = (x: number, y: number, colSpan: number, rowSpan: number): void => {
    for (let dy = 0; dy < rowSpan; dy++) {
      const ry = y + dy;
      if (!occupied[ry]) occupied[ry] = new Array(columns).fill(false);
      for (let dx = 0; dx < colSpan; dx++) {
        occupied[ry][x + dx] = true;
      }
    }
  };

  for (const widget of widgets) {
    const { colSpan, rowSpan } = clampWidgetSize(
      widget.widget_type,
      Math.min(columns, widget.col_span),
      widget.row_span,
    );

    let placedX = 0;
    let placedY = 0;
    let placed = false;
    for (let y = 0; !placed; y++) {
      for (let x = 0; x <= columns - colSpan; x++) {
        if (fits(x, y, colSpan, rowSpan)) {
          placedX = x;
          placedY = y;
          placed = true;
          break;
        }
      }
    }

    mark(placedX, placedY, colSpan, rowSpan);
    packed.push({
      ...widget,
      col_x: placedX,
      col_y: placedY,
      col_span: colSpan,
      row_span: rowSpan,
    });
  }

  return packed;
}

export function repackWidgets<
  T extends {
    widget_type: WidgetType;
    col_span: number;
    row_span: number;
    col_x: number;
    col_y: number;
  },
>(widgets: T[]): T[] {
  return repackWidgetsForColumns(widgets, GRID_COLUMNS);
}

export function getMobileRowSpan(type: WidgetType, fallback: number): number {
  return MOBILE_ROW_SPANS[type] ?? fallback;
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
