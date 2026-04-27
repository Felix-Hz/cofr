import { useMemo, useState } from "react";
import { useBudgets } from "~/lib/budgets";
import type { Budget } from "~/lib/schemas";
import { formatCurrency } from "~/lib/utils";

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-negative-btn";
  if (pct >= 85) return "bg-warning-text";
  return "bg-emerald";
}

function BudgetRow({ budget }: { budget: Budget }) {
  const pct = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
  const over = budget.spent > budget.amount;
  const overshoot = budget.budget_type === "income" ? budget.spent >= budget.amount : over;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
              budget.budget_type === "income"
                ? "bg-emerald/15 text-emerald"
                : "bg-surface-elevated text-content-tertiary"
            }`}
          >
            {budget.budget_type === "income" ? "target" : "limit"}
          </span>
          <span className="text-xs font-medium text-content-primary truncate">{budget.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`tabular-nums text-xs font-semibold ${overshoot ? "text-negative-text" : "text-content-secondary"}`}
          >
            {formatCurrency(budget.spent, budget.currency, true, 0)}
          </span>
          <span className="text-content-muted text-xs">/</span>
          <span className="tabular-nums text-xs text-content-muted">
            {formatCurrency(budget.amount, budget.currency, true, 0)}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetOverviewWidget() {
  const { budgets, loading } = useBudgets();
  const [showInactive, setShowInactive] = useState(false);

  const { active, inactive } = useMemo(() => {
    const a = budgets.filter((b) => b.is_active);
    const i = budgets.filter((b) => !b.is_active);
    return { active: a, inactive: i };
  }, [budgets]);

  const displayed = showInactive ? budgets : active;

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
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.5" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Budgets
        </div>
        {inactive.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="text-[10px] text-content-muted hover:text-content-secondary transition-colors"
          >
            {showInactive ? "Hide inactive" : `+${inactive.length} inactive`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <svg
            className="h-8 w-8 text-content-muted/50"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.5" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <p className="text-xs text-content-muted">No budgets yet</p>
          <p className="text-[11px] text-content-muted/70">Add budgets in Settings → Budgets</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3.5 min-h-0">
          {displayed.map((b) => (
            <BudgetRow key={b.id} budget={b} />
          ))}
        </div>
      )}
    </div>
  );
}
