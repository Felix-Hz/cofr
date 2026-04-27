import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getBudgets } from "./api";
import type { Budget } from "./schemas";

// ── Default name generation ──────────────────────────────────────────────────

const SINGLE_EXPENSE_NAMES: Record<string, string[]> = {
  food: ["The Snack Tax", "Guilty Pleasures", "The Hunger Games", "Feed Me Fund"],
  groceries: ["The Grocery Bill of Doom", "Fridge Dreams", "Cart Full of Regrets", "Pantry Fund"],
  dining: ["Restaurant Roulette", "Eating Out Again", "The Tasting Menu", "Bon Appétit Budget"],
  transport: ["Wheels & Woes", "Getting There Fund", "The Commuter's Curse", "Road Tax"],
  travel: ["Wonderful Travel", "Wanderlust Fund", "The Adventure Tax", "Miles & Smiles"],
  entertainment: ["Fun Money", "The Good Times Fund", "Joy Allocation", "Let Loose Limit"],
  shopping: ["Retail Therapy", "The Splurge Jar", "Buy More Things", "Damage Control Fund"],
  health: ["Body Maintenance", "The Wellness Tax", "Keep Me Alive Fund", "Healthy & Broke"],
  utilities: ["The Boring Essentials", "Keep the Lights On", "Bills Bills Bills", "Adulting Fund"],
  housing: ["Damned Housing", "The Rent Trap", "Bricks & Broke", "Shelter Spending"],
  education: ["Getting Smarter Fund", "The Brain Budget", "Invest in Me", "School of Thought"],
  subscriptions: [
    "The Subscription Trap",
    "Digital Habits",
    "Monthly Obligations",
    "Streaming Everything",
  ],
  miscellaneous: ["Random Chaos Fund", "Life Happens Budget", "The Miscellany", "Catch-All Chaos"],
  savings: ["Squirrel Mode", "Rainy Day Reserve", "The Nest Egg", "Future Me Fund"],
  salary: ["Paycheque Tracker", "The Monthly Haul", "Show Me the Money", "Income Goal"],
  freelance: ["Side Hustle Score", "The Gig Economy", "Invoice Hunter", "Freelance Flow"],
  investments: ["Money Making Money", "The Portfolio Goal", "Compound Interest Fund", "Rich Plans"],
};

const MULTI_EXPENSE_NAMES = [
  "The Grand Plan",
  "Operation: Adulting",
  "The Everything Budget",
  "My Master Strategy",
  "The Whole Shebang",
  "Budget of Many Things",
  "The Catch-All",
  "Life, Budgeted",
];

const SINGLE_INCOME_NAMES: Record<string, string[]> = {
  salary: ["Paycheque Goal", "The Monthly Haul", "Show Me the Money", "Income Target"],
  freelance: ["Side Hustle Target", "Gig Economy Goal", "Invoice Hunter", "Freelance Flow"],
  investments: ["Passive Income Goal", "Money Making Money", "Dividend Dreams", "Portfolio Income"],
};

const MULTI_INCOME_NAMES = [
  "The Revenue Plan",
  "Multiple Streams",
  "Income Ambition",
  "Show Me the Money",
  "The Earnings Target",
];

function _pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function generateBudgetDefaultName(
  categoryNames: string[],
  budgetType: "expense" | "income",
): string {
  const lookup = budgetType === "income" ? SINGLE_INCOME_NAMES : SINGLE_EXPENSE_NAMES;
  const multiFallback = budgetType === "income" ? MULTI_INCOME_NAMES : MULTI_EXPENSE_NAMES;

  if (categoryNames.length === 0) {
    return _pickRandom(multiFallback);
  }

  if (categoryNames.length === 1) {
    const slug = _slugify(categoryNames[0]);
    for (const [key, options] of Object.entries(lookup)) {
      if (slug.includes(key) || key.includes(slug)) {
        return _pickRandom(options);
      }
    }
    // No keyword match: personalise with category name using a fun template
    const templates =
      budgetType === "expense"
        ? [
            `Wonderful ${categoryNames[0]}`,
            `The ${categoryNames[0]} Fund`,
            `${categoryNames[0]} Control`,
            `Spending on ${categoryNames[0]}`,
          ]
        : [
            `${categoryNames[0]} Goal`,
            `${categoryNames[0]} Target`,
            `Earning from ${categoryNames[0]}`,
          ];
    return _pickRandom(templates);
  }

  // Multiple categories: pick a fun multi-name
  return _pickRandom(multiFallback);
}

// ── Context ──────────────────────────────────────────────────────────────────

interface BudgetsContextValue {
  budgets: Budget[];
  refresh: () => Promise<void>;
  loading: boolean;
}

const BudgetsContext = createContext<BudgetsContextValue>({
  budgets: [],
  refresh: async () => {},
  loading: true,
});

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch {
      // Silently fail; budgets will be empty
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    refresh();
  }, []);

  return (
    <BudgetsContext.Provider value={{ budgets, refresh, loading }}>
      {children}
    </BudgetsContext.Provider>
  );
}

export function useBudgets() {
  return useContext(BudgetsContext);
}
