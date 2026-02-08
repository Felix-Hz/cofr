import {
  type RouteConfig,
  route,
  index,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("./routes/_index.tsx"),
  route("login", "./routes/login.tsx"),
  route("auth/callback", "./routes/auth-callback.tsx"),

  // Protected dashboard routes with shared layout
  route("dashboard", "./routes/dashboard/_layout.tsx", [
    index("./routes/dashboard/index.tsx"),
    route("expenses", "./routes/dashboard/expenses.tsx"),
    route("stats", "./routes/dashboard/stats.tsx"),
    route("settings", "./routes/dashboard/settings.tsx"),
  ]),

  // Logout action route
  route("logout", "./routes/logout.tsx"),
] satisfies RouteConfig;
