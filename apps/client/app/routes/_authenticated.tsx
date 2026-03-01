import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
} from "react-router";
import { getTokenPayload, isAuthenticated } from "~/lib/auth";
import { getUserInitials } from "~/lib/utils";
import ThemeToggle from "~/components/ThemeToggle";

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

  return (
    <div className="min-h-screen bg-surface-page">
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
              <div className="relative group">
                <button
                  type="button"
                  className="h-10 w-10 rounded-full bg-emerald text-white flex items-center justify-center hover:bg-emerald-hover transition-colors"
                >
                  {getUserInitials(user?.username || "User")}
                </button>
                <div className="absolute right-0 mt-0.5 w-48 bg-surface-primary rounded-md shadow-lg border border-edge-default hidden group-hover:block z-10">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-content-secondary border-b border-edge-default">
                      {user?.username || "User"}
                    </div>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover"
                    >
                      Settings
                    </Link>
                    <Link
                      to="/logout"
                      className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover"
                    >
                      Log out
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
