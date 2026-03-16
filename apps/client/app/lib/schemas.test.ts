import {
  AccountCreateSchema,
  CategoryCreateSchema,
  ExpenseCreateSchema,
  ExpenseSchema,
  MonthlyStatsSchema,
  TransferCreateSchema,
} from "./schemas";

describe("CategoryCreateSchema", () => {
  it("rejects empty name", () => {
    expect(() =>
      CategoryCreateSchema.parse({ name: "", color_light: "#ff0000", color_dark: "#cc0000" }),
    ).toThrow();
  });

  it("rejects invalid hex color", () => {
    expect(() =>
      CategoryCreateSchema.parse({ name: "Food", color_light: "red", color_dark: "#cc0000" }),
    ).toThrow();
  });

  it("accepts valid category", () => {
    const result = CategoryCreateSchema.parse({
      name: "Food",
      color_light: "#ff0000",
      color_dark: "#cc0000",
      type: "expense",
    });
    expect(result.name).toBe("Food");
  });

  it("defaults type to expense", () => {
    const result = CategoryCreateSchema.parse({
      name: "Food",
      color_light: "#ff0000",
      color_dark: "#cc0000",
    });
    expect(result.type).toBe("expense");
  });
});

describe("ExpenseCreateSchema", () => {
  it("rejects negative amount", () => {
    expect(() => ExpenseCreateSchema.parse({ amount: -1, category_id: "cat-1" })).toThrow();
  });

  it("defaults currency to NZD", () => {
    const result = ExpenseCreateSchema.parse({ amount: 10, category_id: "cat-1" });
    expect(result.currency).toBe("NZD");
  });
});

describe("ExpenseSchema", () => {
  it("coerces date string to Date", () => {
    const result = ExpenseSchema.parse({
      id: "e1",
      amount: 10,
      category_id: "cat-1",
      category_name: "Food",
      category_color_light: "#ff0000",
      category_color_dark: "#cc0000",
      category_type: "expense",
      description: "lunch",
      created_at: "2024-01-01T00:00:00",
      currency: "NZD",
      account_id: "acc-1",
      account_name: "Checking",
    });
    expect(result.created_at).toBeInstanceOf(Date);
  });
});

describe("MonthlyStatsSchema", () => {
  it("defaults account_balances to []", () => {
    const result = MonthlyStatsSchema.parse({
      total_spent: 100,
      total_income: 200,
      transaction_count: 5,
      expense_count: 3,
      category_breakdown: [],
      currency: "NZD",
    });
    expect(result.account_balances).toEqual([]);
  });
});

describe("AccountCreateSchema", () => {
  it("defaults type to checking", () => {
    const result = AccountCreateSchema.parse({ name: "My Account" });
    expect(result.type).toBe("checking");
  });
});

describe("TransferCreateSchema", () => {
  it("accepts valid transfer", () => {
    const result = TransferCreateSchema.parse({
      amount: 100,
      from_account_id: "acc-1",
      to_account_id: "acc-2",
      currency: "NZD",
    });
    expect(result.amount).toBe(100);
    expect(result.from_account_id).toBe("acc-1");
    expect(result.to_account_id).toBe("acc-2");
  });
});
