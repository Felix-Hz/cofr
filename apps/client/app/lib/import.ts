import type { ImportPreviewRow, ImportRowDecision } from "./schemas";

/** Where a row goes: `cat:<categoryId>`, `xfer:<accountId>`, or "" when undecided. */
export type ImportTarget = string;

export interface RowDecision {
  include: boolean;
  target: ImportTarget;
  /** The user has explicitly set this row's target (a guess they keep is no longer a guess). */
  reviewed: boolean;
}

export interface MerchantGroup {
  key: string;
  merchant: string;
  direction: "debit" | "credit";
  rows: ImportPreviewRow[];
  total: number;
  /** Every suggestion in the group is a fallback guess. */
  guessed: boolean;
}

export const categoryTarget = (id: string): ImportTarget => `cat:${id}`;
export const transferTarget = (accountId: string): ImportTarget => `xfer:${accountId}`;

export function groupKey(row: Pick<ImportPreviewRow, "merchant" | "direction">): string {
  return `${row.direction}:${row.merchant.trim().toLowerCase()}`;
}

/**
 * Default decision for a row. Previous decisions survive a re-preview (e.g. after
 * switching account), except that a row's inclusion follows its new status.
 */
export function suggestedTarget(row: ImportPreviewRow): ImportTarget {
  if (row.suggested_transfer_account_id) return transferTarget(row.suggested_transfer_account_id);
  return row.suggested_category_id ? categoryTarget(row.suggested_category_id) : "";
}

export function initialDecision(row: ImportPreviewRow, previous?: RowDecision): RowDecision {
  const reviewed = previous?.reviewed ?? false;
  const target = (reviewed && previous?.target) || suggestedTarget(row);
  const include = row.status === "new" ? (previous?.include ?? true) : false;
  return { include, target, reviewed };
}

/** A group still showing a fallback guess the user hasn't confirmed. */
export function needsCheck(group: MerchantGroup, decisions: Map<number, RowDecision>): boolean {
  if (!group.guessed) return false;
  return group.rows.some((r) => {
    const d = decisions.get(r.index);
    return !!d?.include && !d.reviewed;
  });
}

/**
 * Rows grouped by counterparty so a repeating store is decided once. Order is
 * computed from the preview alone so groups don't jump around while editing:
 * guesses first (they need a look), then the biggest groups.
 */
export function groupRows(rows: ImportPreviewRow[]): MerchantGroup[] {
  const groups = new Map<string, MerchantGroup>();
  for (const row of rows) {
    if (row.status === "already_imported") continue;
    const key = groupKey(row);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        merchant: row.merchant,
        direction: row.direction,
        rows: [],
        total: 0,
        guessed: true,
      };
      groups.set(key, group);
    }
    group.rows.push(row);
    group.total += row.amount;
    if (row.suggestion_source !== "default") group.guessed = false;
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(b.guessed) - Number(a.guessed) ||
      b.rows.length - a.rows.length ||
      b.total - a.total ||
      a.merchant.localeCompare(b.merchant),
  );
}

/** The single target shared by every included row, or null when they differ. */
export function sharedTarget(
  group: MerchantGroup,
  decisions: Map<number, RowDecision>,
): ImportTarget | null {
  const targets = new Set(
    group.rows
      .map((r) => decisions.get(r.index))
      .filter((d): d is RowDecision => !!d?.include)
      .map((d) => d.target),
  );
  if (targets.size === 0) return decisions.get(group.rows[0].index)?.target ?? "";
  return targets.size === 1 ? [...targets][0] : null;
}

export function buildDecisions(
  rows: ImportPreviewRow[],
  decisions: Map<number, RowDecision>,
  merchantNames: Map<string, string>,
): ImportRowDecision[] {
  const out: ImportRowDecision[] = [];
  for (const row of rows) {
    const decision = decisions.get(row.index);
    if (!decision?.include || !decision.target) continue;
    const renamed = merchantNames.get(groupKey(row))?.trim();
    const merchant = renamed && renamed !== row.merchant ? { merchant: renamed } : {};
    if (decision.target.startsWith("xfer:")) {
      out.push({ index: row.index, transfer_account_id: decision.target.slice(5), ...merchant });
    } else {
      out.push({ index: row.index, category_id: decision.target.slice(4), ...merchant });
    }
  }
  return out;
}

export function importTotals(
  rows: ImportPreviewRow[],
  decisions: Map<number, RowDecision>,
): { count: number; moneyIn: number; moneyOut: number; undecided: number } {
  let count = 0;
  let moneyIn = 0;
  let moneyOut = 0;
  let undecided = 0;
  for (const row of rows) {
    const decision = decisions.get(row.index);
    if (!decision?.include) continue;
    if (!decision.target) {
      undecided += 1;
      continue;
    }
    count += 1;
    if (row.direction === "credit") moneyIn += row.amount;
    else moneyOut += row.amount;
  }
  return { count, moneyIn, moneyOut, undecided };
}
