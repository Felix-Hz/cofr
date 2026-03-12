import { useEffect, useRef, useState } from "react";
import { redirect } from "react-router";
import CategoryFormModal from "~/components/CategoryFormModal";
import DeleteAccountModal from "~/components/DeleteAccountModal";
import { PasswordRequirements } from "~/components/PasswordRequirements";
import {
  changePassword,
  createCategory,
  deleteCategory,
  getLinkedProviders,
  getPreferences,
  initTelegramLink,
  toggleCategory,
  unlinkProvider,
  updateCategory,
  updatePreferences,
} from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";
import { useCategories } from "~/lib/categories";
import { isPasswordValid } from "~/lib/password";
import type { Category, CategoryCreate, CategoryUpdate } from "~/lib/schemas";

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Categories
  const { categories, refresh: refreshCategories } = useCategories();
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const systemCategories = categories.filter((c) => c.is_system);
  const customCategories = categories.filter((c) => !c.is_system);
  // Income, Savings, Investment are always active — not toggleable
  const POSITIVE_TYPES = ["income", "savings", "investment"];

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
      setError(err instanceof Error ? err.message : "Failed to save category");
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

  const hasLocalAuth = providers.some((p) => p.provider === "local");

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
    <div className="max-w-2xl">
      <title>Cofr | Settings</title>
      <h2 className="text-2xl font-bold text-content-primary mb-6">Settings</h2>

      {error && (
        <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-md mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Preferences */}
      <div className="bg-surface-primary rounded-lg border border-edge-default mb-6">
        <div className="px-6 py-4 border-b border-edge-default">
          <h3 className="text-lg font-medium text-content-primary">Preferences</h3>
          <p className="text-sm text-content-tertiary mt-1">Customize your experience</p>
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
        </div>
      </div>

      {/* Categories */}
      <div className="bg-surface-primary rounded-lg border border-edge-default mb-6">
        <div className="px-6 py-4 border-b border-edge-default">
          <h3 className="text-lg font-medium text-content-primary">Categories</h3>
          <p className="text-sm text-content-tertiary mt-1">
            Manage system and custom categories for your transactions
          </p>
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
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      cat.is_active ? "bg-emerald" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
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
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      cat.is_active ? "bg-emerald" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
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
            className="px-4 py-2 text-sm font-medium text-emerald border border-emerald/30 rounded-md hover:bg-emerald/10 transition-colors"
          >
            + Add Custom Category
          </button>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="bg-surface-primary rounded-lg border border-edge-default">
        <div className="px-6 py-4 border-b border-edge-default">
          <h3 className="text-lg font-medium text-content-primary">Linked Accounts</h3>
          <p className="text-sm text-content-tertiary mt-1">
            Manage your connected authentication providers
          </p>
        </div>

        <div className="divide-y divide-edge-default">
          {/* Linked providers */}
          {providers.map((provider) => (
            <div key={provider.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-content-primary">
                  {PROVIDER_LABELS[provider.provider] || provider.provider}
                </p>
                <p className="text-sm text-content-tertiary">
                  {provider.display_name || provider.email || provider.provider_user_id}
                </p>
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
              <div>
                <p className="font-medium text-content-muted">
                  {PROVIDER_LABELS[provider] || provider}
                </p>
                <p className="text-sm text-content-muted">Not connected</p>
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

      {/* Security — Password Change (only for local auth users) */}
      {hasLocalAuth && (
        <div className="bg-surface-primary rounded-lg border border-edge-default mt-6">
          <div className="px-6 py-4 border-b border-edge-default">
            <h3 className="text-lg font-medium text-content-primary">Security</h3>
            <p className="text-sm text-content-tertiary mt-1">Change your password</p>
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
              <input
                id="current-password"
                type="password"
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
              <input
                id="new-password"
                type="password"
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

      {/* Danger Zone */}
      <div className="bg-surface-primary rounded-lg border border-negative-text/30 mt-6">
        <div className="px-6 py-4 border-b border-negative-text/30 bg-negative-bg rounded-t-lg">
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
      />
    </div>
  );
}
