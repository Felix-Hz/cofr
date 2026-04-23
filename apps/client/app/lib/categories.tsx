import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getCategories } from "./api";
import type { Category } from "./schemas";

interface CategoriesContextValue {
  categories: Category[];
  activeCategories: Category[];
  refresh: () => Promise<void>;
  loading: boolean;
}

const CategoriesContext = createContext<CategoriesContextValue>({
  categories: [],
  activeCategories: [],
  refresh: async () => {},
  loading: true,
});

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      // Silently fail; categories will be empty
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    refresh();
  }, []);

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <CategoriesContext.Provider value={{ categories, activeCategories, refresh, loading }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}
