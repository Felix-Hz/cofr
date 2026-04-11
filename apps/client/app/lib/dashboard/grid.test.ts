import { describe, expect, it } from "vitest";
import type { WidgetType } from "../schemas";
import { layoutRowCount, repackWidgets, widgetGridStyle } from "./grid";

type TestWidget = {
  widget_type: WidgetType;
  col_x: number;
  col_y: number;
  col_span: number;
  row_span: number;
};

const widget = (
  widget_type: WidgetType,
  col_span: number,
  row_span = 1,
  col_x = 0,
  col_y = 0,
): TestWidget => ({ widget_type, col_x, col_y, col_span, row_span });

describe("repackWidgets", () => {
  it("places sequential widgets left-to-right on a single row when they fit", () => {
    const packed = repackWidgets([
      widget("stat_income", 3),
      widget("stat_spent", 3),
      widget("stat_net", 3),
      widget("stat_savings_rate", 3),
    ]);
    expect(packed.map((w) => [w.col_x, w.col_y])).toEqual([
      [0, 0],
      [3, 0],
      [6, 0],
      [9, 0],
    ]);
  });

  it("wraps to a new row when the next widget would overflow 12 columns", () => {
    const packed = repackWidgets([
      widget("category_pie", 6, 3),
      widget("account_balances", 6, 2),
      widget("transactions", 12, 4),
    ]);
    expect(packed[2].col_y).toBeGreaterThan(0);
    expect(packed[2].col_x).toBe(0);
  });

  it("clamps span to per-widget min/max bounds from the registry", () => {
    const packed = repackWidgets([widget("stat_income", 99)]);
    expect(packed[0].col_span).toBeLessThanOrEqual(6);
  });
});

describe("layoutRowCount", () => {
  it("returns at least 1 even for an empty layout", () => {
    expect(layoutRowCount([])).toBe(1);
  });
  it("uses the bottom edge of the deepest widget", () => {
    expect(
      layoutRowCount([
        { widget_type: "stat_income", col_x: 0, col_y: 0, col_span: 3, row_span: 1 },
        { widget_type: "transactions", col_x: 0, col_y: 4, col_span: 12, row_span: 4 },
      ] as TestWidget[]),
    ).toBe(8);
  });
});

describe("widgetGridStyle", () => {
  it("converts 0-indexed coords to CSS Grid 1-indexed line numbers", () => {
    const style = widgetGridStyle({
      widget_type: "category_pie",
      col_x: 0,
      col_y: 3,
      col_span: 6,
      row_span: 3,
    } as TestWidget);
    expect(style.gridColumn).toBe("1 / span 6");
    expect(style.gridRow).toBe("4 / span 3");
  });
});
