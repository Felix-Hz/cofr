import { describe, expect, it } from "vitest";
import {
  buildDecisions,
  categoryTarget,
  groupRows,
  importTotals,
  initialDecision,
  type RowDecision,
  sharedTarget,
  transferTarget,
} from "./import";
import type { ImportPreviewRow } from "./schemas";

function row(overrides: Partial<ImportPreviewRow> & { index: number }): ImportPreviewRow {
  return {
    line: overrides.index + 2,
    date: "2025-03-14",
    amount: 5.5,
    direction: "debit",
    kind: "Visa Purchase",
    merchant: "Daily Grind",
    notes: "",
    status: "new",
    duplicate_of: null,
    suggested_category_id: "food",
    suggestion_source: "rule",
    ...overrides,
  };
}

const decide = (rows: ImportPreviewRow[]) =>
  new Map<number, RowDecision>(rows.map((r) => [r.index, initialDecision(r)]));

describe("initialDecision", () => {
  it("includes new rows with their suggestion and skips duplicates", () => {
    expect(initialDecision(row({ index: 0 }))).toEqual({ include: true, target: "cat:food" });
    expect(initialDecision(row({ index: 0, status: "possible_duplicate" })).include).toBe(false);
    expect(initialDecision(row({ index: 0, status: "already_imported" })).include).toBe(false);
  });

  it("keeps the user's earlier choice across a re-preview", () => {
    const prev = { include: false, target: transferTarget("savings") };
    expect(initialDecision(row({ index: 0 }), prev)).toEqual(prev);
  });
});

describe("groupRows", () => {
  it("groups by merchant and direction, puts guesses first, hides already-imported", () => {
    const rows = [
      row({ index: 0, merchant: "Daily Grind" }),
      row({ index: 1, merchant: "daily grind " }),
      row({ index: 2, merchant: "Daily Grind", direction: "credit" }),
      row({ index: 3, merchant: "Mystery", suggestion_source: "default" }),
      row({ index: 4, merchant: "Old", status: "already_imported" }),
    ];
    const groups = groupRows(rows);
    expect(groups.map((g) => [g.merchant, g.rows.length, g.guessed])).toEqual([
      ["Mystery", 1, true],
      ["Daily Grind", 2, false],
      ["Daily Grind", 1, false],
    ]);
    expect(groups[1].total).toBeCloseTo(11);
  });
});

describe("sharedTarget", () => {
  it("reports a mixed group as null", () => {
    const rows = [row({ index: 0 }), row({ index: 1 })];
    const decisions = decide(rows);
    const [group] = groupRows(rows);
    expect(sharedTarget(group, decisions)).toBe("cat:food");
    decisions.set(1, { include: true, target: categoryTarget("misc") });
    expect(sharedTarget(group, decisions)).toBeNull();
    // Excluded rows don't make a group mixed.
    decisions.set(1, { include: false, target: categoryTarget("misc") });
    expect(sharedTarget(group, decisions)).toBe("cat:food");
  });
});

describe("buildDecisions / importTotals", () => {
  it("sends only included rows, with renames and transfers", () => {
    const rows = [
      row({ index: 0 }),
      row({ index: 1, amount: 200, merchant: "Savings" }),
      row({ index: 2, amount: 3000, direction: "credit", merchant: "Employer" }),
      row({ index: 3, status: "possible_duplicate" }),
    ];
    const decisions = decide(rows);
    decisions.set(1, { include: true, target: transferTarget("acc-2") });
    const names = new Map([["debit:daily grind", "Daily Grind Café"]]);

    expect(buildDecisions(rows, decisions, names)).toEqual([
      { index: 0, category_id: "food", merchant: "Daily Grind Café" },
      { index: 1, transfer_account_id: "acc-2" },
      { index: 2, category_id: "food" },
    ]);
    expect(importTotals(rows, decisions)).toEqual({
      count: 3,
      moneyIn: 3000,
      moneyOut: 205.5,
      undecided: 0,
    });
  });

  it("counts included rows without a target as undecided", () => {
    const rows = [row({ index: 0, suggested_category_id: null, suggestion_source: null })];
    expect(importTotals(rows, decide(rows))).toMatchObject({ count: 0, undecided: 1 });
    expect(buildDecisions(rows, decide(rows), new Map())).toEqual([]);
  });
});
