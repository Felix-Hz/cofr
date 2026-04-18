import { createContext, type ReactNode, useContext } from "react";
import type {
  AccountBalance,
  AccountTrendResponse,
  Expense,
  LifetimeStats,
  MonthlyStats,
  MonthlyTrendResponse,
  RecurringResponse,
  SparklineResponse,
  WeekdayHeatmapResponse,
} from "../schemas";

export type DashboardData = {
  periodStats: MonthlyStats;
  lifetimeStats: LifetimeStats;
  accountBalances: AccountBalance[];
  sparkline: SparklineResponse;
  monthlyTrend: MonthlyTrendResponse;
  weekdayHeatmap: WeekdayHeatmapResponse;
  accountTrend: AccountTrendResponse;
  recurring: RecurringResponse;
  startDate: string;
  endDate: string;
  currency: string | null;
  preferredCurrency: string;
};

export type DashboardTransactionsData = {
  expenses: Expense[];
  expensesTotal: number;
  expensesLimit: number;
  expensesOffset: number;
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
const DashboardTransactionsContext = createContext<DashboardTransactionsData | null>(null);
const DashboardActionsContext = createContext<DashboardDataActions | null>(null);

export function DashboardDataProvider({
  data,
  transactions,
  actions,
  children,
}: {
  data: DashboardData;
  transactions: DashboardTransactionsData;
  actions: DashboardDataActions;
  children: ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={data}>
      <DashboardTransactionsContext.Provider value={transactions}>
        <DashboardActionsContext.Provider value={actions}>
          {children}
        </DashboardActionsContext.Provider>
      </DashboardTransactionsContext.Provider>
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

export function useDashboardTransactionsData(): DashboardTransactionsData {
  const data = useContext(DashboardTransactionsContext);
  if (!data) {
    throw new Error("useDashboardTransactionsData must be used inside DashboardDataProvider");
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
