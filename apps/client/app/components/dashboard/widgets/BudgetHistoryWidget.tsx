import { useEffect, useMemo, useState } from "react";
import { getBudgetHistory } from "~/lib/api";
import { useBudgets } from "~/lib/budgets";
import type { BudgetHistoryPeriod, BudgetHistoryResponse } from "~/lib/schemas";
import { formatCurrency } from "~/lib/utils";

function HistoryBar({
  period,
  max,
  currency,
  budgetType,
}: {
  period: BudgetHistoryPeriod;
  max: number;
  currency: string;
  budgetType: string;
}) {
  const spentH = max > 0 ? (period.spent / max) * 100 : 0;
  const budgetH = max > 0 ? (period.budgeted / max) * 100 : 0;
  const over = period.spent > period.budgeted;
  const isIncome = budgetType === "income";

  return (
    <div className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[2px]">
      {/* Budgeted (target) bar: semi-transparent overlay */}
      <div
        className="absolute bottom-0 w-full rounded-t-[2px] border-t-2 border-dashed border-content-muted/40 pointer-events-none"
        style={{ height: `${budgetH}%` }}
      />
      {/* Actual bar */}
      <div
        className={`relative w-3/4 rounded-t-[2px] transition-opacity ${
          isIncome
            ? over
              ? "bg-emerald"
              : "bg-emerald/60"
            : over
              ? "bg-negative-btn/85 group-hover:bg-negative-btn"
              : "bg-emerald/85 group-hover:bg-emerald"
        }`}
        style={{ height: `${Math.max(spentH, period.spent > 0 ? 2 : 0)}%` }}
      />
      {/* Tooltip */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
        <div className="bg-surface-primary border border-edge-default rounded-md px-2.5 py-1.5 shadow-lg text-[10px] whitespace-nowrap">
          <div className="font-medium text-content-primary">{period.period_label}</div>
          <div className="text-content-secondary">
            Actual: {formatCurrency(period.spent, currency, true, 0)}
          </div>
          <div className="text-content-muted">
            {isIncome ? "Target" : "Limit"}: {formatCurrency(period.budgeted, currency, true, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BudgetHistoryWidget() {
  const { budgets, loading: budgetsLoading } = useBudgets();
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<BudgetHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const periodicBudgets = useMemo(
    () => budgets.filter((b) => b.period_type !== "custom"),
    [budgets],
  );

  // Auto-select first budget
  useEffect(() => {
    if (!selectedId && periodicBudgets.length > 0) {
      setSelectedId(periodicBudgets[0].id);
    }
  }, [periodicBudgets, selectedId]);

  // Fetch history when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setHistoryLoading(true);
    getBudgetHistory(selectedId, 6)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [selectedId]);

  const { max, axisLabels } = useMemo(() => {
    if (!history) return { max: 1, axisLabels: [] };
    const peak = Math.max(1, ...history.periods.flatMap((p) => [p.spent, p.budgeted]));
    return {
      max: peak,
      axisLabels: [
        { id: "top", value: peak },
        { id: "mid", value: peak / 2 },
        { id: "bot", value: 0 },
      ],
    };
  }, [history]);

  const isLoading = budgetsLoading || historyLoading;

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 pb-3.5 pt-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3v18h18M7 17V9m5 8V5m5 12v-7"
            />
          </svg>
          Budget history
        </div>
        {periodicBudgets.length > 1 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-[10px] bg-surface-elevated border border-edge-default rounded px-1.5 py-0.5 text-content-secondary focus:outline-none focus:ring-1 focus:ring-emerald max-w-[180px] truncate"
          >
            {periodicBudgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
        </div>
      ) : periodicBudgets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <p className="text-xs text-content-muted">No recurring budgets yet</p>
          <p className="text-[11px] text-content-muted/70">
            Add weekly or monthly budgets in Settings → Budgets
          </p>
        </div>
      ) : !history || history.periods.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          No history available yet
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-edge-default bg-surface-elevated/65">
            <div className="flex h-full">
              <div className="flex w-14 shrink-0 flex-col justify-between px-2 py-2 text-[9px] font-medium tabular-nums text-content-muted">
                {axisLabels.map((label) => (
                  <div
                    key={label.id}
                    className={`flex items-center gap-1.5 ${label.id === "mid" ? "translate-y-1/2" : ""}`}
                  >
                    <span>{formatCurrency(label.value, history.currency, true, 0)}</span>
                    <span className="h-px flex-1 bg-edge-default/28" />
                  </div>
                ))}
              </div>
              <div className="relative flex min-w-0 flex-1 items-end gap-2 px-2 py-2">
                <div className="pointer-events-none absolute inset-x-2 top-2 border-t border-edge-default/40" />
                <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dashed border-edge-default/35" />
                <div className="pointer-events-none absolute inset-x-2 bottom-2 border-t border-edge-default/40" />
                {history.periods.map((p) => (
                  <HistoryBar
                    key={p.period_label}
                    period={p}
                    max={max}
                    currency={history.currency}
                    budgetType={history.budget_type}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {history.periods.map((p) => (
              <span
                key={p.period_label}
                className="min-w-0 flex-1 truncate text-center text-[9px] font-medium uppercase tracking-wide text-content-muted"
              >
                {p.period_label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 border-t border-edge-default/80 pt-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald/85" />
              <span className="text-content-muted">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 border-t-2 border-dashed border-content-muted/40" />
              <span className="text-content-muted">
                {history.budget_type === "income" ? "Target" : "Limit"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
