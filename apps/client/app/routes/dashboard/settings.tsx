import { useEffect, useState } from "react";
import { redirect } from "react-router";
import { isAuthenticated } from "~/lib/auth";
import { getLinkedProviders, unlinkProvider } from "~/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5784";

interface LinkedProvider {
  id: number;
  provider: string;
  provider_user_id: string;
  email: string | null;
  display_name: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  telegram: "Telegram",
  google: "Google",
  apple: "Apple",
};

const ALL_PROVIDERS = ["google", "apple", "telegram"];

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

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleUnlink = async (id: number) => {
    try {
      await unlinkProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unlink provider",
      );
    }
  };

  const linkedProviderNames = providers.map((p) => p.provider);
  const unlinkedProviders = ALL_PROVIDERS.filter(
    (p) => !linkedProviderNames.includes(p),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-content-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-content-primary mb-6">Settings</h2>

      {error && (
        <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-md mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-surface-primary rounded-lg border border-edge-default">
        <div className="px-6 py-4 border-b border-edge-default">
          <h3 className="text-lg font-medium text-content-primary">
            Linked Accounts
          </h3>
          <p className="text-sm text-content-tertiary mt-1">
            Manage your connected authentication providers
          </p>
        </div>

        <div className="divide-y divide-edge-default">
          {/* Linked providers */}
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-content-primary">
                  {PROVIDER_LABELS[provider.provider] || provider.provider}
                </p>
                <p className="text-sm text-content-tertiary">
                  {provider.display_name || provider.email ||
                    provider.provider_user_id}
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
            <div
              key={provider}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-content-muted">
                  {PROVIDER_LABELS[provider] || provider}
                </p>
                <p className="text-sm text-content-muted">Not connected</p>
              </div>
              {provider === "telegram"
                ? (
                  <span className="text-xs text-content-muted">
                    Link via Telegram bot
                  </span>
                )
                : (
                  <a
                    href={`${API_BASE_URL}/auth/oauth/${provider}/login`}
                    className="px-3 py-1.5 text-sm font-medium text-content-tertiary border border-edge-strong rounded-md hover:bg-surface-hover transition-colors pointer-events-none opacity-50"
                  >
                    {/* TODO: Finish registering OAuth providers */}
                    Coming Soon
                  </a>
                )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-content-tertiary mt-4">
        The Telegram bot requires a linked Telegram account to track expenses
        via chat.
      </p>
    </div>
  );
}
