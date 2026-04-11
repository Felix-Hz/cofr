import { createContext, type ReactNode, useContext } from "react";
import type {
  AccountBalance,
  Expense,
  LifetimeStats,
  MonthlyStats,
  SparklineResponse,
} from "../schemas";

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
  onTransactionsPageChange: (nextOffset: number) => void;
  onTransactionsPageSizeChange: (nextLimit: number) => void;
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
