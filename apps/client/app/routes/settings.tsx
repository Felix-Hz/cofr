import { useCallback, useEffect, useRef, useState } from "react";
import { redirect } from "react-router";
import CategoryFormModal from "~/components/CategoryFormModal";
import DeleteAccountModal from "~/components/DeleteAccountModal";
import PasswordInput from "~/components/PasswordInput";
import { PasswordRequirements } from "~/components/PasswordRequirements";
import { useAccounts } from "~/lib/accounts";
import {
  changePassword,
  createAccount,
  createCategory,
  createExpense,
  deleteAccount,
  deleteCategory,
  getLinkedProviders,
  getPreferences,
  initTelegramLink,
  toggleCategory,
  unlinkProvider,
  updateAccount,
  updateCategory,
  updatePreferences,
} from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";
import { useCategories } from "~/lib/categories";
import { SUPPORTED_CURRENCIES } from "~/lib/constants";
import { isPasswordValid } from "~/lib/password";
import type { Account, Category, CategoryCreate, CategoryUpdate } from "~/lib/schemas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5784";

const CURRENCIES = ["NZD", "EUR", "USD", "GBP", "AUD"];

interface LinkedProvider {
  id: string;
  provider: string;
  provider_user_id: string;
  email: string | null;
  display_name: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  telegram: "Telegram",
  google: "Google",
  local: "Email",
};

const ALL_PROVIDERS = ["google", "telegram"];

const SECTIONS = [
  { id: "preferences", label: "Preferences" },
  { id: "accounts", label: "Accounts" },
  { id: "categories", label: "Categories" },
  { id: "linked-accounts", label: "Linked Accounts" },
  { id: "security", label: "Security" },
  { id: "danger-zone", label: "Danger Zone" },
] as const;

// --- Section icons ---
function GearIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
      />
    </svg>
  );
}

// Provider icons
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function getProviderIcon(provider: string) {
  switch (provider) {
    case "google":
      return <GoogleIcon />;
    case "telegram":
      return <TelegramIcon />;
    case "local":
      return <EnvelopeIcon />;
    default:
      return null;
  }
}

export async function clientLoader() {
  if (!isAuthenticated()) {
    throw redirect("/login");
  }
  return null;
}

export default function Settings() {
  const [providers, setProviders] = useState<LinkedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ code: string; deep_link: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState("NZD");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Tab bar
  const [activeTab, setActiveTab] = useState<string>("preferences");
  const [showTabs, setShowTabs] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Categories
  const { categories, refresh: refreshCategories } = useCategories();
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Accounts (financial)
  const { accounts, refresh: refreshAccounts } = useAccounts();
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [savingDefaultAccount, setSavingDefaultAccount] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<string>("checking");
  const [newAccountStartingBalance, setNewAccountStartingBalance] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("NZD");
  const [acctLoading, setAcctLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [deletingAcctId, setDeletingAcctId] = useState<string | null>(null);
  const [balanceAccountId, setBalanceAccountId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState("NZD");

  const systemAccounts = accounts.filter((a) => a.is_system);
  const customAccounts = accounts.filter((a) => !a.is_system);

  const systemCategories = categories.filter((c) => c.is_system);
  const customCategories = categories.filter((c) => !c.is_system);
  // Income is always active — not toggleable
  const POSITIVE_TYPES = ["income"];

  const hasLocalAuth = providers.some((p) => p.provider === "local");
  // Filter sections — hide Security if no local auth
  const visibleSections = SECTIONS.filter((s) => s.id !== "security" || hasLocalAuth);

  // Show tab bar once the title scrolls out of view
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when loading finishes so titleRef.current is available
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowTabs(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = useCallback((id: string) => {
    setActiveTab(id);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleToggleCategory = async (id: string) => {
    try {
      await toggleCategory(id);
      await refreshCategories();
    } catch {
      setError("Failed to toggle category");
    }
  };

  const handleCategorySubmit = async (data: CategoryCreate | CategoryUpdate) => {
    setCatLoading(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data as CategoryUpdate);
      } else {
        await createCategory(data as CategoryCreate);
      }
      await refreshCategories();
      setCatModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      // biome-ignore lint/complexity/noUselessCatch: rethrow needed so finally runs while propagating error to modal
      throw err;
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingCatId(id);
    try {
      await deleteCategory(id);
      await refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCatId(null);
    }
  };

  const handleDefaultAccountChange = async (accountId: string) => {
    setDefaultAccountId(accountId);
    setSavingDefaultAccount(true);
    try {
      const prefs = await updatePreferences({ default_account_id: accountId });
      localStorage.setItem("cofr_default_account_id", prefs.default_account_id ?? "");
    } catch {
      setError("Failed to save default account");
    } finally {
      setSavingDefaultAccount(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    setAcctLoading(true);
    try {
      const account = await createAccount({
        name: newAccountName.trim(),
        type: newAccountType as "checking" | "savings" | "investment",
      });
      const startBal = parseFloat(newAccountStartingBalance);
      if (startBal > 0) {
        const incomeCategory = categories.find((c) => c.type === "income");
        if (incomeCategory) {
          await createExpense({
            amount: startBal,
            category_id: incomeCategory.id,
            description: "",
            currency: newAccountCurrency,
            is_opening_balance: true,
            account_id: account.id,
          });
        }
      }
      await refreshAccounts();
      setAddingAccount(false);
      setNewAccountName("");
      setNewAccountType("checking");
      setNewAccountStartingBalance("");
      setNewAccountCurrency("NZD");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setAcctLoading(false);
    }
  };

  const handleUpdateAccount = async (id: string) => {
    if (!editAccountName.trim()) return;
    setAcctLoading(true);
    try {
      await updateAccount(id, { name: editAccountName.trim() });
      await refreshAccounts();
      setEditingAccount(null);
      setEditAccountName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setAcctLoading(false);
    }
  };

  const handleSetBalance = async () => {
    if (!balanceAccountId) return;
    const amt = parseFloat(balanceAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    setAcctLoading(true);
    try {
      const incomeCategory = categories.find((c) => c.type === "income");
      if (incomeCategory) {
        await createExpense({
          amount: amt,
          category_id: incomeCategory.id,
          description: "",
          currency: balanceCurrency,
          is_opening_balance: true,
          account_id: balanceAccountId,
        });
      }
      await refreshAccounts();
      setBalanceAccountId(null);
      setBalanceAmount("");
      setBalanceCurrency("NZD");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set balance");
    } finally {
      setAcctLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    setDeletingAcctId(id);
    try {
      await deleteAccount(id);
      await refreshAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeletingAcctId(null);
    }
  };

  const fetchProviders = async () => {
    try {
      const data = await getLinkedProviders();
      setProviders(data);
    } catch {
      setError("Failed to load linked providers");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const prefs = await getPreferences();
      setPreferredCurrency(prefs.preferred_currency);
      setSessionTimeout(prefs.session_timeout_minutes);
      setDefaultAccountId(prefs.default_account_id ?? null);
      localStorage.setItem("cofr_default_account_id", prefs.default_account_id ?? "");
    } catch {
      // Silently fall back to default
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    fetchProviders();
    fetchPreferences();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const linkedProviderNames = providers.map((p) => p.provider);
  const unlinkedProviders = ALL_PROVIDERS.filter((p) => !linkedProviderNames.includes(p));

  const handleCurrencyChange = async (currency: string) => {
    setPreferredCurrency(currency);
    setSavingCurrency(true);
    try {
      await updatePreferences({ preferred_currency: currency });
    } catch {
      setError("Failed to save currency preference");
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleTimeoutChange = async (value: string) => {
    const minutes = value === "" ? null : Number(value);
    setSessionTimeout(minutes);
    setSavingTimeout(true);
    try {
      await updatePreferences({ session_timeout_minutes: minutes });
      if (minutes !== null) {
        localStorage.setItem("cofr_session_timeout", String(minutes));
      } else {
        localStorage.removeItem("cofr_session_timeout");
      }
      window.dispatchEvent(new CustomEvent("cofr:session-timeout", { detail: minutes }));
    } catch {
      setError("Failed to save session timeout");
    } finally {
      setSavingTimeout(false);
    }
  };

  const handleLinkTelegram = async () => {
    setError(null);
    try {
      const data = await initTelegramLink();
      setLinkData(data);
      window.open(data.deep_link, "_blank");

      // Poll for linking completion
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await getLinkedProviders();
          if (updated.some((p) => p.provider === "telegram")) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setLinkData(null);
            setProviders(updated);
          }
        } catch {
          // Silently retry
        }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Telegram link");
    }
  };

  const handleCancelLink = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    setLinkData(null);
  };

  const handleUnlink = async (id: string) => {
    try {
      await unlinkProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink provider");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-content-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <title>Cofr | Settings</title>
      <h2 ref={titleRef} className="text-2xl font-bold text-content-primary mb-4">
        Settings
      </h2>

      {/* Tab bar — appears on scroll (fixed to viewport) */}
      <div
        className={`flex gap-1 overflow-x-auto scrollbar-hide fixed top-0 left-0 right-0 z-40 bg-surface-page/80 backdrop-blur-md border-b border-edge-default shadow-sm px-4 py-2.5 transition-all duration-200 ${
          showTabs ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none -translate-y-full"
        }`}
      >
        {visibleSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              activeTab === section.id
                ? "bg-emerald text-white"
                : "text-content-tertiary hover:text-content-secondary hover:bg-surface-hover"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-xl mb-6 flex items-center justify-between animate-slide-down">
          <p className="text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 shrink-0 text-negative-text/70 hover:text-negative-text transition-colors"
            aria-label="Dismiss error"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Preferences ── */}
      <div
        id="preferences"
        ref={(el) => {
          sectionRefs.current.preferences = el;
        }}
        style={{ scrollMarginTop: "4rem" }}
        className="bg-surface-primary rounded-xl border border-edge-default mb-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="px-6 py-4 border-b border-edge-default flex items-center gap-3">
          <span className="text-content-tertiary">
            <GearIcon />
          </span>
          <div>
            <h3 className="text-lg font-medium text-content-primary">Preferences</h3>
            <p className="text-sm text-content-tertiary mt-0.5">Customize your experience</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-content-primary">Default Currency</p>
              <p className="text-sm text-content-tertiary">
                Used as the default filter on the dashboard
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={preferredCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={savingCurrency}
                className="px-3 py-1.5 text-sm font-medium bg-surface-primary text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {savingCurrency && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-content-primary" />
              )}
            </div>
          </div>

          {accounts.length > 0 && (
            <>
              <div className="border-t border-edge-default mt-4 pt-4" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-content-primary">Default Payment Account</p>
                  <p className="text-sm text-content-tertiary">
                    Pre-selected when adding transactions
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={defaultAccountId || ""}
                    onChange={(e) => handleDefaultAccountChange(e.target.value)}
                    disabled={savingDefaultAccount}
                    className="max-w-40 truncate px-3 py-1.5 text-sm font-medium bg-surface-primary text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {savingDefaultAccount && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-content-primary" />
                  )}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-edge-default mt-4 pt-4" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-content-primary">Session Timeout</p>
              <p className="text-sm text-content-tertiary">
                Automatically log out after inactivity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={
                  sessionTimeout === null || sessionTimeout === 15 ? "" : String(sessionTimeout)
                }
                onChange={(e) => handleTimeoutChange(e.target.value)}
                disabled={savingTimeout}
                className="px-3 py-1.5 text-sm font-medium bg-surface-primary text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                <option value="1">1 min</option>
                <option value="5">5 min</option>
                <option value="">15 min (default)</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="0">Never</option>
              </select>
              {savingTimeout && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-content-primary" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Accounts (Financial) ── */}
      <div
        id="accounts"
        ref={(el) => {
          sectionRefs.current.accounts = el;
        }}
        style={{ scrollMarginTop: "4rem" }}
        className="bg-surface-primary rounded-xl border border-edge-default mb-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="px-6 py-4 border-b border-edge-default flex items-center gap-3">
          <span className="text-content-tertiary">
            <VaultIcon />
          </span>
          <div>
            <h3 className="text-lg font-medium text-content-primary">Accounts</h3>
            <p className="text-sm text-content-tertiary mt-0.5">Manage your financial accounts</p>
          </div>
        </div>

        {/* System Accounts */}
        <div className="px-6 py-3">
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-2">
            System Accounts
          </p>
        </div>
        <div className="divide-y divide-edge-default border-t border-edge-default">
          {systemAccounts.map((acct) => (
            <div key={acct.id}>
              <div className="px-6 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-4 h-4 shrink-0 text-content-tertiary">
                    {acct.type === "checking" ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                        />
                      </svg>
                    ) : acct.type === "savings" ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-medium text-content-primary truncate">
                    {acct.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-elevated text-content-tertiary">
                    System
                  </span>
                  {defaultAccountId === acct.id && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald/10 text-emerald">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editingAccount?.id === acct.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        maxLength={60}
                        className="px-2 py-1 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateAccount(acct.id)}
                        disabled={acctLoading}
                        className="text-xs font-medium text-white bg-emerald rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccount(null)}
                        className="text-xs font-medium text-content-tertiary px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acct);
                          setEditAccountName(acct.name);
                        }}
                        className="px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft-bg rounded"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceAccountId(acct.id);
                          setBalanceAmount("");
                          setBalanceCurrency("NZD");
                        }}
                        className="px-2 py-1 text-xs font-medium text-emerald hover:bg-emerald/5 rounded"
                      >
                        <span className="sm:hidden">Set</span>
                        <span className="hidden sm:inline">Set balance</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              {balanceAccountId === acct.id && (
                <div className="px-6 pb-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
                  />
                  <select
                    value={balanceCurrency}
                    onChange={(e) => setBalanceCurrency(e.target.value)}
                    className="w-20 shrink-0 px-2 py-1.5 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSetBalance}
                    disabled={acctLoading || !balanceAmount || parseFloat(balanceAmount) <= 0}
                    className="shrink-0 text-xs font-medium text-white bg-emerald rounded-md px-3 py-1.5 disabled:opacity-50"
                  >
                    {acctLoading ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAccountId(null)}
                    className="shrink-0 text-xs font-medium text-content-tertiary px-2 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Accounts */}
        <div className="px-6 py-3 border-t border-edge-default">
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-2">
            Custom Accounts
          </p>
        </div>
        {customAccounts.length > 0 ? (
          <div className="divide-y divide-edge-default border-t border-edge-default">
            {customAccounts.map((acct) => (
              <div key={acct.id}>
                <div className="px-6 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-4 h-4 shrink-0 text-content-tertiary">
                      {acct.type === "checking" ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                          />
                        </svg>
                      ) : acct.type === "savings" ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-content-primary truncate">
                      {acct.name}
                    </span>
                    {defaultAccountId === acct.id && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald/10 text-emerald">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingAccount?.id === acct.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editAccountName}
                          onChange={(e) => setEditAccountName(e.target.value)}
                          maxLength={60}
                          className="px-2 py-1 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateAccount(acct.id)}
                          disabled={acctLoading}
                          className="text-xs font-medium text-white bg-emerald rounded-md px-3 py-1.5 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAccount(null)}
                          className="text-xs font-medium text-content-tertiary px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(acct);
                            setEditAccountName(acct.name);
                          }}
                          className="px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft-bg rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBalanceAccountId(acct.id);
                            setBalanceAmount("");
                            setBalanceCurrency("NZD");
                          }}
                          className="px-2 py-1 text-xs font-medium text-emerald hover:bg-emerald/5 rounded"
                        >
                          Set balance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acct.id)}
                          disabled={deletingAcctId === acct.id}
                          className="px-2 py-1 text-xs font-medium text-negative-text hover:bg-negative-bg rounded disabled:opacity-50"
                        >
                          {deletingAcctId === acct.id ? "..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {balanceAccountId === acct.id && (
                  <div className="px-6 pb-3 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
                    />
                    <select
                      value={balanceCurrency}
                      onChange={(e) => setBalanceCurrency(e.target.value)}
                      className="w-20 shrink-0 px-2 py-1.5 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSetBalance}
                      disabled={acctLoading || !balanceAmount || parseFloat(balanceAmount) <= 0}
                      className="shrink-0 text-xs font-medium text-white bg-emerald rounded-md px-3 py-1.5 disabled:opacity-50"
                    >
                      {acctLoading ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAccountId(null)}
                      className="shrink-0 text-xs font-medium text-content-tertiary px-2 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 pb-2">
            <p className="text-sm text-content-muted">No custom accounts yet</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-edge-default">
          {addingAccount ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  maxLength={60}
                  placeholder="Account name"
                  className="flex-1 px-3 py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
                />
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="sm:w-32 px-2 py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAccountStartingBalance}
                  onChange={(e) => setNewAccountStartingBalance(e.target.value)}
                  placeholder="Starting balance"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald"
                />
                <select
                  value={newAccountCurrency}
                  onChange={(e) => setNewAccountCurrency(e.target.value)}
                  className="w-20 shrink-0 px-2 py-2 text-sm border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={acctLoading || !newAccountName.trim()}
                  className="shrink-0 text-xs font-medium text-white bg-emerald rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {acctLoading ? "..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingAccount(false);
                    setNewAccountName("");
                    setNewAccountType("checking");
                    setNewAccountStartingBalance("");
                    setNewAccountCurrency("NZD");
                  }}
                  className="text-xs font-medium text-content-tertiary px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingAccount(true)}
              className="w-full py-2.5 text-sm font-medium text-emerald border-2 border-dashed border-emerald/40 hover:border-emerald hover:bg-emerald/5 rounded-lg transition-colors"
            >
              + Add Account
            </button>
          )}
        </div>
      </div>

      {/* ── Categories ── */}
      <div
        id="categories"
        ref={(el) => {
          sectionRefs.current.categories = el;
        }}
        style={{ scrollMarginTop: "4rem" }}
        className="bg-surface-primary rounded-xl border border-edge-default mb-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="px-6 py-4 border-b border-edge-default flex items-center gap-3">
          <span className="text-content-tertiary">
            <TagIcon />
          </span>
          <div>
            <h3 className="text-lg font-medium text-content-primary">Categories</h3>
            <p className="text-sm text-content-tertiary mt-0.5">
              Manage system and custom categories for your transactions
            </p>
          </div>
        </div>

        {/* System Categories */}
        <div className="px-6 py-3">
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-2">
            System Categories
          </p>
        </div>
        <div className="divide-y divide-edge-default border-t border-edge-default">
          {systemCategories.map((cat) => {
            const isPositive = POSITIVE_TYPES.includes(cat.type);
            return (
              <div key={cat.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color_light }}
                  />
                  <div>
                    <span className="text-sm font-medium text-content-primary">{cat.name}</span>
                    {cat.alias && (
                      <span className="ml-2 text-xs text-content-tertiary">{cat.alias}</span>
                    )}
                  </div>
                </div>
                {isPositive ? (
                  <span className="text-xs text-content-muted">Always active</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      cat.is_active ? "bg-emerald" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        cat.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Categories */}
        <div className="px-6 py-3 border-t border-edge-default">
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-2">
            Custom Categories
          </p>
        </div>
        {customCategories.length > 0 ? (
          <div className="divide-y divide-edge-default border-t border-edge-default">
            {customCategories.map((cat) => (
              <div key={cat.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color_light }}
                  />
                  <div>
                    <span className="text-sm font-medium text-content-primary">{cat.name}</span>
                    {cat.alias && (
                      <span className="ml-2 text-xs text-content-tertiary">{cat.alias}</span>
                    )}
                    <span className="ml-2 text-xs text-content-muted capitalize">{cat.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      cat.is_active ? "bg-emerald" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        cat.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCatModalOpen(true);
                    }}
                    className="px-2 py-1 text-xs font-medium text-content-secondary hover:bg-surface-hover rounded"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingCatId === cat.id}
                    className="px-2 py-1 text-xs font-medium text-negative-text hover:bg-negative-bg rounded disabled:opacity-50"
                  >
                    {deletingCatId === cat.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 pb-2">
            <p className="text-sm text-content-muted">No custom categories yet</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-edge-default">
          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setCatModalOpen(true);
            }}
            className="w-full py-2.5 text-sm font-medium text-emerald border-2 border-dashed border-emerald/40 hover:border-emerald hover:bg-emerald/5 rounded-lg transition-colors"
          >
            + Add Custom Category
          </button>
        </div>
      </div>

      {/* ── Linked Accounts ── */}
      <div
        id="linked-accounts"
        ref={(el) => {
          sectionRefs.current["linked-accounts"] = el;
        }}
        style={{ scrollMarginTop: "4rem" }}
        className="bg-surface-primary rounded-xl border border-edge-default mb-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="px-6 py-4 border-b border-edge-default flex items-center gap-3">
          <span className="text-content-tertiary">
            <LinkIcon />
          </span>
          <div>
            <h3 className="text-lg font-medium text-content-primary">Linked Accounts</h3>
            <p className="text-sm text-content-tertiary mt-0.5">
              Manage your connected authentication providers
            </p>
          </div>
        </div>

        <div className="divide-y divide-edge-default">
          {/* Linked providers */}
          {providers.map((provider) => (
            <div key={provider.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-content-tertiary">{getProviderIcon(provider.provider)}</span>
                <div>
                  <p className="font-medium text-content-primary">
                    {PROVIDER_LABELS[provider.provider] || provider.provider}
                  </p>
                  <p className="text-sm text-content-tertiary">
                    {provider.display_name || provider.email || provider.provider_user_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleUnlink(provider.id)}
                disabled={providers.length <= 1}
                className="px-3 py-1.5 text-sm font-medium text-negative-text border border-negative-text/30 rounded-md hover:bg-negative-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Unlink
              </button>
            </div>
          ))}

          {/* Unlinked providers */}
          {unlinkedProviders.map((provider) => (
            <div key={provider} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-content-muted">{getProviderIcon(provider)}</span>
                <div>
                  <p className="font-medium text-content-muted">
                    {PROVIDER_LABELS[provider] || provider}
                  </p>
                  <p className="text-sm text-content-muted">Not connected</p>
                </div>
              </div>
              {provider === "telegram" ? (
                linkData ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={linkData.deep_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm font-medium text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors"
                    >
                      Open Telegram
                    </a>
                    <button
                      type="button"
                      onClick={handleCancelLink}
                      className="px-3 py-1.5 text-sm font-medium text-content-tertiary border border-edge-default rounded-md hover:bg-surface-hover transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkTelegram}
                    className="px-3 py-1.5 text-sm font-medium text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors"
                  >
                    Link Telegram
                  </button>
                )
              ) : (
                <a
                  href={`${API_BASE_URL}/auth/oauth/${provider}/login`}
                  className="px-3 py-1.5 text-sm font-medium text-content-primary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors"
                >
                  Link
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Security — Password Change (only for local auth users) ── */}
      {hasLocalAuth && (
        <div
          id="security"
          ref={(el) => {
            sectionRefs.current.security = el;
          }}
          style={{ scrollMarginTop: "4rem" }}
          className="bg-surface-primary rounded-xl border border-edge-default mb-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="px-6 py-4 border-b border-edge-default flex items-center gap-3">
            <span className="text-content-tertiary">
              <LockIcon />
            </span>
            <div>
              <h3 className="text-lg font-medium text-content-primary">Security</h3>
              <p className="text-sm text-content-tertiary mt-0.5">Change your password</p>
            </div>
          </div>
          <form onSubmit={handlePasswordChange} className="px-6 py-4 space-y-4">
            {passwordMessage && (
              <div
                className={`px-4 py-3 rounded-md text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-positive-bg border border-positive-text text-positive-text"
                    : "bg-negative-bg border border-negative-text text-negative-text"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Current password
              </label>
              <PasswordInput
                id="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                New password
              </label>
              <PasswordInput
                id="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
              />
              <PasswordRequirements password={newPassword} />
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !isPasswordValid(newPassword)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-md disabled:opacity-50 transition-colors"
            >
              {passwordLoading ? "Saving..." : "Change password"}
            </button>
          </form>
        </div>
      )}

      {linkData && (
        <p className="text-sm text-content-tertiary mt-2">
          Or send{" "}
          <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">
            /start {linkData.code}
          </code>{" "}
          to the bot in{" "}
          <a
            href={linkData.deep_link.split("?")[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-content-secondary"
          >
            Telegram
          </a>
          . Code expires in 10 minutes.
        </p>
      )}

      {/* ── Danger Zone ── */}
      <div
        id="danger-zone"
        ref={(el) => {
          sectionRefs.current["danger-zone"] = el;
        }}
        style={{ scrollMarginTop: "4rem" }}
        className="bg-surface-primary rounded-xl border border-negative-text/30 mb-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-negative-text/30 bg-negative-bg rounded-t-xl flex items-center gap-3">
          <span className="text-negative-text/70">
            <AlertTriangleIcon />
          </span>
          <h3 className="text-lg font-medium text-content-primary">Danger Zone</h3>
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-content-primary">Delete account</p>
            <p className="text-sm text-content-tertiary">
              Deactivate or permanently delete your account and data
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm font-medium text-negative-text border border-negative-text/30 rounded-md hover:bg-negative-bg transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        hasLocalAuth={hasLocalAuth}
      />

      <CategoryFormModal
        isOpen={catModalOpen}
        onClose={() => {
          setCatModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
        isLoading={catLoading}
        categories={categories}
      />
    </div>
  );
}
