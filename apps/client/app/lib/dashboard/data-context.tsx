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

export type DashboardMeta = Pick<
  DashboardData,
  "startDate" | "endDate" | "currency" | "preferredCurrency"
>;

const DashboardMetaContext = createContext<DashboardMeta | null>(null);
const DashboardPeriodStatsContext = createContext<MonthlyStats | null>(null);
const DashboardLifetimeStatsContext = createContext<LifetimeStats | null>(null);
const DashboardAccountBalancesContext = createContext<AccountBalance[] | null>(null);
const DashboardSparklineContext = createContext<SparklineResponse | null>(null);
const DashboardMonthlyTrendContext = createContext<MonthlyTrendResponse | null>(null);
const DashboardWeekdayHeatmapContext = createContext<WeekdayHeatmapResponse | null>(null);
const DashboardAccountTrendContext = createContext<AccountTrendResponse | null>(null);
const DashboardRecurringContext = createContext<RecurringResponse | null>(null);
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
  const meta: DashboardMeta = {
    startDate: data.startDate,
    endDate: data.endDate,
    currency: data.currency,
    preferredCurrency: data.preferredCurrency,
  };

  return (
    <DashboardMetaContext.Provider value={meta}>
      <DashboardPeriodStatsContext.Provider value={data.periodStats}>
        <DashboardLifetimeStatsContext.Provider value={data.lifetimeStats}>
          <DashboardAccountBalancesContext.Provider value={data.accountBalances}>
            <DashboardSparklineContext.Provider value={data.sparkline}>
              <DashboardMonthlyTrendContext.Provider value={data.monthlyTrend}>
                <DashboardWeekdayHeatmapContext.Provider value={data.weekdayHeatmap}>
                  <DashboardAccountTrendContext.Provider value={data.accountTrend}>
                    <DashboardRecurringContext.Provider value={data.recurring}>
                      <DashboardTransactionsContext.Provider value={transactions}>
                        <DashboardActionsContext.Provider value={actions}>
                          {children}
                        </DashboardActionsContext.Provider>
                      </DashboardTransactionsContext.Provider>
                    </DashboardRecurringContext.Provider>
                  </DashboardAccountTrendContext.Provider>
                </DashboardWeekdayHeatmapContext.Provider>
              </DashboardMonthlyTrendContext.Provider>
            </DashboardSparklineContext.Provider>
          </DashboardAccountBalancesContext.Provider>
        </DashboardLifetimeStatsContext.Provider>
      </DashboardPeriodStatsContext.Provider>
    </DashboardMetaContext.Provider>
  );
}

export function useDashboardData(): DashboardData {
  return {
    periodStats: useDashboardPeriodStats(),
    lifetimeStats: useDashboardLifetimeStats(),
    accountBalances: useDashboardAccountBalances(),
    sparkline: useDashboardSparkline(),
    monthlyTrend: useDashboardMonthlyTrend(),
    weekdayHeatmap: useDashboardWeekdayHeatmap(),
    accountTrend: useDashboardAccountTrend(),
    recurring: useDashboardRecurring(),
    ...useDashboardMeta(),
  };
}

export function useDashboardMeta(): DashboardMeta {
  const meta = useContext(DashboardMetaContext);
  if (!meta) {
    throw new Error("useDashboardMeta must be used inside DashboardDataProvider");
  }
  return meta;
}

export function useDashboardPeriodStats(): MonthlyStats {
  const periodStats = useContext(DashboardPeriodStatsContext);
  if (!periodStats) {
    throw new Error("useDashboardPeriodStats must be used inside DashboardDataProvider");
  }
  return periodStats;
}

export function useDashboardLifetimeStats(): LifetimeStats {
  const lifetimeStats = useContext(DashboardLifetimeStatsContext);
  if (!lifetimeStats) {
    throw new Error("useDashboardLifetimeStats must be used inside DashboardDataProvider");
  }
  return lifetimeStats;
}

export function useDashboardAccountBalances(): AccountBalance[] {
  const accountBalances = useContext(DashboardAccountBalancesContext);
  if (!accountBalances) {
    throw new Error("useDashboardAccountBalances must be used inside DashboardDataProvider");
  }
  return accountBalances;
}

export function useDashboardSparkline(): SparklineResponse {
  const sparkline = useContext(DashboardSparklineContext);
  if (!sparkline) {
    throw new Error("useDashboardSparkline must be used inside DashboardDataProvider");
  }
  return sparkline;
}

export function useDashboardMonthlyTrend(): MonthlyTrendResponse {
  const monthlyTrend = useContext(DashboardMonthlyTrendContext);
  if (!monthlyTrend) {
    throw new Error("useDashboardMonthlyTrend must be used inside DashboardDataProvider");
  }
  return monthlyTrend;
}

export function useDashboardWeekdayHeatmap(): WeekdayHeatmapResponse {
  const weekdayHeatmap = useContext(DashboardWeekdayHeatmapContext);
  if (!weekdayHeatmap) {
    throw new Error("useDashboardWeekdayHeatmap must be used inside DashboardDataProvider");
  }
  return weekdayHeatmap;
}

export function useDashboardAccountTrend(): AccountTrendResponse {
  const accountTrend = useContext(DashboardAccountTrendContext);
  if (!accountTrend) {
    throw new Error("useDashboardAccountTrend must be used inside DashboardDataProvider");
  }
  return accountTrend;
}

export function useDashboardRecurring(): RecurringResponse {
  const recurring = useContext(DashboardRecurringContext);
  if (!recurring) {
    throw new Error("useDashboardRecurring must be used inside DashboardDataProvider");
  }
  return recurring;
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
