import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getAccounts } from "./api";
import type { Account } from "./schemas";

interface AccountsContextValue {
  accounts: Account[];
  refresh: () => Promise<void>;
  loading: boolean;
}

const AccountsContext = createContext<AccountsContextValue>({
  accounts: [],
  refresh: async () => {},
  loading: true,
});

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const accts = await getAccounts();
      setAccounts(accts);
    } catch {
      // Silently fail; accounts will be empty
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    refresh();
  }, []);

  return (
    <AccountsContext.Provider value={{ accounts, refresh, loading }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  return useContext(AccountsContext);
}
