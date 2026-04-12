import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // Public routes
  index("./routes/_index.tsx"),
  route("login", "./routes/login.tsx"),
  route("forgot-password", "./routes/forgot-password.tsx"),
  route("reset-password", "./routes/reset-password.tsx"),
  route("auth/callback", "./routes/auth-callback.tsx"),

  // Protected routes with shared layout (auth guard + header/nav)
  layout("./routes/_authenticated.tsx", [
    route("dashboard", "./routes/dashboard/index.tsx"),
    route("settings", "./routes/settings.tsx"),
  ]),

  // Logout action route
  route("logout", "./routes/logout.tsx"),

  // Catch-all — render root ErrorBoundary for unmatched routes
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;
