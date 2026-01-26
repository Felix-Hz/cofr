import {
  type RouteConfig,
  route,
  layout,
  index,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("./routes/_index.tsx"),
  route("login", "./routes/login.tsx"),

  // Protected dashboard routes with shared layout
  route("dashboard", "./routes/dashboard/_layout.tsx", [
    index("./routes/dashboard/index.tsx"),
    route("expenses", "./routes/dashboard/expenses.tsx"),
    route("stats", "./routes/dashboard/stats.tsx"),
  ]),

  // Logout action route
  route("logout", "./routes/logout.tsx"),
] satisfies RouteConfig;
