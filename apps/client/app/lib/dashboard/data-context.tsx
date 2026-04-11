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

const DashboardDataContext = createContext<DashboardData | null>(null);
const DashboardActionsContext = createContext<DashboardDataActions | null>(null);

export function DashboardDataProvider({
  data,
  actions,
  children,
}: {
  data: DashboardData;
  actions: DashboardDataActions;
  children: ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={data}>
      <DashboardActionsContext.Provider value={actions}>
        {children}
      </DashboardActionsContext.Provider>
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardData {
  const data = useContext(DashboardDataContext);
  if (!data) {
    throw new Error("useDashboardData must be used inside DashboardDataProvider");
  }
  return data;
}

export function useDashboardActions(): DashboardDataActions {
  const actions = useContext(DashboardActionsContext);
  if (!actions) {
    throw new Error("useDashboardActions must be used inside DashboardDataProvider");
  }
  return actions;
}
