import { useEffect, useRef, useState } from "react";
import { Link, Outlet, redirect, useLoaderData } from "react-router";
import OfflineBanner from "~/components/OfflineBanner";
import ThemeToggle from "~/components/ThemeToggle";
import { useSessionTimeout } from "~/hooks/useSessionTimeout";
import { AccountsProvider } from "~/lib/accounts";
import { updatePreferences } from "~/lib/api";
import { getTokenPayload, isAuthenticated } from "~/lib/auth";
import { CategoriesProvider } from "~/lib/categories";
import { RecurringProvider } from "~/lib/recurring";
import { getUserInitials } from "~/lib/utils";

export async function clientLoader() {
  if (!isAuthenticated()) {
    throw redirect("/login");
  }

  const payload = getTokenPayload();
  return { user: payload };
}

export default function AuthenticatedLayout() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const { user } = loaderData;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Session timeout
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("cofr_session_timeout");
    if (stored !== null && stored !== "") return Number(stored);
    return null;
  });
  useSessionTimeout(sessionTimeoutMinutes);

  // Listen for timeout changes from Settings (same tab) and other tabs
  useEffect(() => {
    function handleTimeoutChange(e: Event) {
      const value = (e as CustomEvent<number | null>).detail;
      setSessionTimeoutMinutes(value);
    }
    function handleStorage(e: StorageEvent) {
      if (e.key === "cofr_session_timeout") {
        setSessionTimeoutMinutes(
          e.newValue !== null && e.newValue !== "" ? Number(e.newValue) : null,
        );
      }
    }
    window.addEventListener("cofr:session-timeout", handleTimeoutChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("cofr:session-timeout", handleTimeoutChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // One-shot: report the browser's detected timezone so recurring rules
  // fire at the user's local midnight. Guarded by localStorage so we don't
  // PATCH on every page load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("cofr_tz_synced")) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      updatePreferences({ timezone: tz })
        .then(() => localStorage.setItem("cofr_tz_synced", tz))
        .catch(() => {});
    } catch {
      // Intl unavailable — skip silently
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside as EventListener);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-surface-page">
      <OfflineBanner />
      {/* Header */}
      <header className="bg-surface-primary border-b border-edge-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard">
              <img src="/logo.png" alt="cofr" className="h-8 logo-auto" />
            </Link>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="h-10 w-10 rounded-full bg-emerald text-white flex items-center justify-center hover:bg-emerald-hover transition-colors"
                >
                  {getUserInitials(user?.username || "User")}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-0.5 w-48 bg-surface-primary rounded-md shadow-lg border border-edge-default z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-content-secondary border-b border-edge-default truncate">
                        {user?.username || "User"}
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover"
                      >
                        Settings
                      </Link>
                      <Link
                        to="/logout"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover"
                      >
                        Log out
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <CategoriesProvider>
        <AccountsProvider>
          <RecurringProvider>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Outlet />
            </main>
          </RecurringProvider>
        </AccountsProvider>
      </CategoriesProvider>
    </div>
  );
}
