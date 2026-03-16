import type { Category } from "./schemas";
import {
  formatCurrency,
  formatDate,
  getCategoryColor,
  getUserInitials,
  isPositiveType,
  truncateText,
} from "./utils";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Food",
    slug: "food",
    color_light: "#ef4444",
    color_dark: "#dc2626",
    icon: null,
    is_active: true,
    is_system: true,
    display_order: 1,
    type: "expense",
  },
];

describe("formatCurrency", () => {
  it("formats USD", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
  });

  it("formats JPY with no decimals", () => {
    const result = formatCurrency(1234, "JPY");
    expect(result).toContain("1,234");
    expect(result).not.toContain(".");
  });

  it("formats compact millions", () => {
    const result = formatCurrency(1_500_000, "USD", true);
    expect(result).toContain("M");
  });

  it("respects maximumFractionDigits", () => {
    expect(formatCurrency(1.999, "USD", false, 0)).toBe("$2");
  });
});

describe("formatDate", () => {
  // Use a non-UTC date to avoid timezone shifts changing the day
  const date = new Date(2024, 0, 15, 14, 30, 0);

  it("short includes year and month", () => {
    const result = formatDate(date, "short");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
  });

  it("long includes full month name", () => {
    const result = formatDate(date, "long");
    expect(result).toContain("January");
  });

  it("compact omits year", () => {
    const result = formatDate(date, "compact");
    expect(result).not.toContain("2024");
  });
});

describe("getCategoryColor", () => {
  it("returns matching light color", () => {
    expect(getCategoryColor("cat-1", mockCategories)).toBe("#ef4444");
  });

  it("returns dark color", () => {
    expect(getCategoryColor("cat-1", mockCategories, true)).toBe("#dc2626");
  });

  it("returns fallback for unknown id", () => {
    expect(getCategoryColor("unknown", mockCategories)).toBe("#6b7280");
    expect(getCategoryColor("unknown", mockCategories, true)).toBe("#9ca3af");
  });
});

describe("truncateText", () => {
  it("truncates with ellipsis", () => {
    expect(truncateText("Hello World, this is long", 10)).toBe("Hello Worl...");
  });

  it("returns original when short", () => {
    expect(truncateText("short", 10)).toBe("short");
  });
});

describe("getUserInitials", () => {
  it("extracts initials from full name", () => {
    expect(getUserInitials("John Doe")).toBe("JD");
  });

  it("handles single name", () => {
    expect(getUserInitials("alice")).toBe("A");
  });
});

describe("isPositiveType", () => {
  it("returns true for income", () => {
    expect(isPositiveType("income")).toBe(true);
  });

  it("returns false for expense", () => {
    expect(isPositiveType("expense")).toBe(false);
  });
});
