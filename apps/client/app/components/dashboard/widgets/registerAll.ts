import { registerWidgets } from "~/lib/dashboard/registry";
import { AccountBalancesWidget } from "./AccountBalancesWidget";
import { CategoryPieWidget } from "./CategoryPieWidget";
import { NetWorthWidget } from "./NetWorthWidget";
import { PeriodStats4UpWidget } from "./PeriodStats4UpWidget";
import { SavingsInvestmentWidget } from "./SavingsInvestmentWidget";
import { SpendSparklineWidget } from "./SpendSparklineWidget";
import { StatIncomeWidget } from "./StatIncomeWidget";
import { StatNetWidget } from "./StatNetWidget";
import { StatSavingsRateWidget } from "./StatSavingsRateWidget";
import { StatSpentWidget } from "./StatSpentWidget";
import { TransactionsWidget } from "./TransactionsWidget";

let registered = false;

export function ensureWidgetsRegistered(): void {
  if (registered) return;
  registerWidgets({
    period_stats_4up: PeriodStats4UpWidget,
    stat_income: StatIncomeWidget,
    stat_spent: StatSpentWidget,
    stat_net: StatNetWidget,
    stat_savings_rate: StatSavingsRateWidget,
    category_pie: CategoryPieWidget,
    account_balances: AccountBalancesWidget,
    transactions: TransactionsWidget,
    net_worth: NetWorthWidget,
    savings_investment: SavingsInvestmentWidget,
    spend_sparkline: SpendSparklineWidget,
  });
  registered = true;
}
