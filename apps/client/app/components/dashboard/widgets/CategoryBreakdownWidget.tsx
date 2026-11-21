import { useMemo } from "react";
import { useDashboardPeriodStats } from "~/lib/dashboard/data-context";
import { useTheme } from "~/lib/theme";

export type BreakdownRow = {
  category: string;
  total: number;
  count: number;
  share: number;
  color: string;
};

type BreakdownInput = {
  category: string;
  category_type?: string | null;
  total: number;
  count: number;
  category_color_light: string;
  category_color_dark: string;
};

/** Spending categories, largest first, each with its share of the period's spending. */
export function breakdownRows(
  categories: BreakdownInput[],
  totalSpent: number,
  dark: boolean,
): BreakdownRow[] {
  return categories
    .filter((cat) => cat.category_type !== "income")
    .map((cat) => ({
      category: cat.category,
      total: cat.total,
      count: cat.count,
      share: totalSpent > 0 ? cat.total / totalSpent : 0,
      color: dark ? cat.category_color_dark : cat.category_color_light,
    }))
    .sort((a, b) => b.total - a.total);
}

/** The finding, computed from the rows: "Groceries was 31% of spending". */
export function breakdownFinding(rows: BreakdownRow[]): string | null {
  const top = rows[0];
  if (!top || top.share <= 0) return null;
  const pct = Math.round(top.share * 100);
  if (rows.length === 1) return `All spending went to ${top.category}`;
  return `${top.category} was ${pct}% of spending`;
}

// Past this many rows, the rest fold into "Other" so the list never scrolls inside a tile
const MAX_ROWS = 6;

/**
 * Ranked bars, not a pie: lengths compare at a glance where angles don't, and the value sits on each row.
 * One cobalt series; the category's own colour is only the key square beside its name.
 */
export function CategoryBreakdownWidget() {
  const periodStats = useDashboardPeriodStats();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const rows = useMemo(
    () => breakdownRows(periodStats.category_breakdown, periodStats.total_spent, dark),
    [periodStats, dark],
  );

  const shown = useMemo(() => {
    if (rows.length <= MAX_ROWS) return rows;
    const head = rows.slice(0, MAX_ROWS - 1);
    const tail = rows.slice(MAX_ROWS - 1);
    const other: BreakdownRow = {
      category: `Other (${tail.length})`,
      total: tail.reduce((s, r) => s + r.total, 0),
      count: tail.reduce((s, r) => s + r.count, 0),
      share: tail.reduce((s, r) => s + r.share, 0),
      color: "var(--sm-ink-3)",
    };
    return [...head, other];
  }, [rows]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: periodStats.currency,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }),
    [periodStats.currency],
  );

  const finding = breakdownFinding(rows);
  const max = shown[0]?.total ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 pb-3.5 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label">Category breakdown</p>
        {rows.length > 0 && (
          <span className="label shrink-0">
            {rows.length} {rows.length === 1 ? "category" : "categories"}
          </span>
        )}
      </div>
      {shown.length > 0 ? (
        <>
          {finding && (
            <p className="mt-1.5 font-display text-[17px] leading-snug text-content-heading">
              {finding}.
            </p>
          )}
          <ul className="mt-3 flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-hidden">
            {shown.map((row) => (
              <li
                key={row.category}
                className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3"
                title={`${row.category}: ${money.format(row.total)}, ${row.count} transactions`}
              >
                <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-content-secondary">
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate">{row.category}</span>
                </span>
                <span className="relative h-2" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 bg-data-1"
                    style={{ width: `${max > 0 ? Math.max((row.total / max) * 100, 1) : 0}%` }}
                  />
                </span>
                <span className="figures text-[12px] text-content-primary text-right">
                  {money.format(row.total)}
                  <span className="ml-2 inline-block w-9 text-content-tertiary">
                    {Math.round(row.share * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-1">
          <p className="font-display text-[17px] text-content-heading">No spending this period.</p>
          <p className="text-[12.5px] text-content-tertiary">
            Categories rank here as transactions come in.
          </p>
        </div>
      )}
    </div>
  );
}
