import { describe, expect, it } from "vitest";
import { breakdownFinding, breakdownRows } from "./CategoryBreakdownWidget";

const cat = (category: string, total: number, type: string | null = "expense") => ({
  category,
  category_type: type,
  total,
  count: 1,
  category_color_light: "#2f56c9",
  category_color_dark: "#6b86ee",
});

describe("breakdownRows", () => {
  it("drops income, ranks by total and computes shares", () => {
    const rows = breakdownRows(
      [cat("Rent", 500), cat("Salary", 4000, "income"), cat("Groceries", 300)],
      800,
      false,
    );
    expect(rows.map((r) => r.category)).toEqual(["Rent", "Groceries"]);
    expect(rows[0]?.share).toBeCloseTo(0.625);
  });

  it("uses the dark colour in dark mode", () => {
    expect(breakdownRows([cat("Rent", 1)], 1, true)[0]?.color).toBe("#6b86ee");
  });
});

describe("breakdownFinding", () => {
  it("names the largest category and its share", () => {
    const rows = breakdownRows(
      [cat("Groceries", 310), cat("Rent", 200), cat("Fun", 490)],
      1000,
      false,
    );
    expect(breakdownFinding(rows)).toBe("Fun was 49% of spending");
  });

  it("rounds the share", () => {
    const rows = breakdownRows(
      [cat("Groceries", 310), cat("Rent", 200), cat("Fun", 120), cat("Bus", 370)],
      1000,
      false,
    );
    expect(breakdownFinding(rows)).toBe("Bus was 37% of spending");
  });

  it("says when everything went to one place, and nothing for no spending", () => {
    expect(breakdownFinding(breakdownRows([cat("Rent", 10)], 10, false))).toBe(
      "All spending went to Rent",
    );
    expect(breakdownFinding([])).toBeNull();
  });
});
