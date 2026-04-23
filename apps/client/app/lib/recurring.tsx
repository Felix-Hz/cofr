import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { listRecurringRules } from "./api";
import type { RecurringIntervalUnit, RecurringRule } from "./schemas";

// ── Cadence math (mirrors apps/server/app/services/recurring_service.py) ──

function daysInMonth(year: number, month: number): number {
  // month is 1-12
  return new Date(year, month, 0).getDate();
}

function addMonths(d: Date, months: number): Date {
  const total = d.getMonth() + months;
  const year = d.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12; // 0-11
  const last = daysInMonth(year, month + 1);
  const day = Math.min(d.getDate(), last);
  return new Date(year, month, day);
}

function isoDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(s: string): Date | null {
  // Accepts "YYYY-MM-DD". Interpreted as a local date so the preview matches the user's calendar.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function advance(
  ruleStart: Date,
  unit: RecurringIntervalUnit,
  count: number,
  fromDate: Date,
): Date {
  if (unit === "day") {
    const stepMs = 86400000 * count;
    let next = new Date(ruleStart.getTime());
    while (next.getTime() <= fromDate.getTime()) {
      next = new Date(next.getTime() + stepMs);
    }
    return next;
  }
  if (unit === "week") {
    const stepMs = 86400000 * 7 * count;
    let next = new Date(ruleStart.getTime());
    while (next.getTime() <= fromDate.getTime()) {
      next = new Date(next.getTime() + stepMs);
    }
    return next;
  }
  if (unit === "month") {
    let k = 0;
    while (true) {
      k += 1;
      const next = addMonths(ruleStart, k * count);
      if (next.getTime() > fromDate.getTime()) return next;
    }
  }
  // year
  let k = 0;
  while (true) {
    k += 1;
    const next = addMonths(ruleStart, k * 12 * count);
    if (next.getTime() > fromDate.getTime()) return next;
  }
}

export function previewUpcoming(
  startDateIso: string,
  unit: RecurringIntervalUnit,
  count: number,
  n: number,
  endDateIso?: string | null,
): string[] {
  const start = parseIsoDate(startDateIso);
  if (!start || count < 1) return [];
  const end = endDateIso ? parseIsoDate(endDateIso) : null;

  const out: string[] = [];
  let cursor = start;
  for (let i = 0; i < n; i += 1) {
    if (end && cursor.getTime() > end.getTime()) break;
    out.push(isoDate(cursor));
    cursor = advance(start, unit, count, cursor);
  }
  return out;
}

interface RecurringContextValue {
  rules: RecurringRule[];
  refresh: () => Promise<void>;
  loading: boolean;
}

const RecurringContext = createContext<RecurringContextValue>({
  rules: [],
  refresh: async () => {},
  loading: true,
});

export function RecurringProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await listRecurringRules();
      setRules(next);
    } catch {
      // Silent failure matches AccountsProvider/CategoriesProvider
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    refresh();
  }, []);

  return (
    <RecurringContext.Provider value={{ rules, refresh, loading }}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  return useContext(RecurringContext);
}
