import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
} from "react-router";
import { getTokenPayload, isAuthenticated } from "~/lib/auth";
import { getUserInitials } from "~/lib/utils";

export async function clientLoader() {
  // Protect all dashboard routes
  if (!isAuthenticated()) {
    throw redirect("/login");
  }

  const payload = getTokenPayload();
  return { user: payload };
}

export default function DashboardLayout() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const location = useLocation();
  const { user } = loaderData;

  const navItems = [
    { path: "/dashboard", label: "Overview" },
    { path: "/dashboard/expenses", label: "Transactions" },
    { path: "/dashboard/stats", label: "Statistics" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard">
                <img src="/logo.png" alt="cofr" className="h-8" />
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? "bg-emerald-soft text-navy"
                        : "text-slate-500 hover:text-navy hover:bg-cloud"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="relative group">
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-emerald text-white flex items-center justify-center hover:bg-emerald-hover transition-colors"
              >
                {getUserInitials(user?.username || "User")}
              </button>
              <div className="absolute right-0 mt-0.5 w-48 bg-white rounded-md shadow-lg border hidden group-hover:block z-10">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    {user?.username || "User"}
                  </div>
                  <Link
                    to="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  <Link
                    to="/logout"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Log out
                  </Link>
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
