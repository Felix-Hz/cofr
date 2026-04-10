import { createContext, type ReactNode, useContext } from "react";
import type {
  AccountBalance,
  Expense,
  LifetimeStats,
  MonthlyStats,
  SparklineResponse,
} from "../schemas";

/**
 * Shared data delivered to every widget.
 *
 * Widgets read from this context instead of firing their own network requests,
 * so one period change = one loader round trip. Future widgets can subscribe
 * to additional slices by extending this interface and the dashboard loader.
 */
export type DashboardData = {
  periodStats: MonthlyStats;
  lifetimeStats: LifetimeStats;
  expenses: Expense[];
  expensesTotal: number;
  expensesLimit: number;
  expensesOffset: number;
  accountBalances: AccountBalance[];
  sparkline: SparklineResponse;
  startDate: string;
  endDate: string;
  currency: string | null;
  preferredCurrency: string;
};

export type DashboardDataActions = {
  onExpenseEdit: (expense: Expense) => void;
  onExpenseDelete: (expense: Expense) => void;
  onCreateExpense: () => void;
  onCreateTransfer: () => void;
};

export type DashboardContextValue = DashboardData & DashboardDataActions;

const DashboardDataContext = createContext<DashboardContextValue | null>(null);

export function DashboardDataProvider({
  value,
  children,
}: {
  value: DashboardContextValue;
  children: ReactNode;
}) {
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used inside DashboardDataProvider");
  }
  return ctx;
}
