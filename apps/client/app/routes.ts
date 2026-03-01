import {
  type RouteConfig,
  route,
  index,
  layout,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("./routes/_index.tsx"),
  route("login", "./routes/login.tsx"),
  route("auth/callback", "./routes/auth-callback.tsx"),

  // Protected routes with shared layout (auth guard + header/nav)
  layout("./routes/_authenticated.tsx", [
    route("dashboard", "./routes/dashboard/index.tsx"),
    route("settings", "./routes/settings.tsx"),
  ]),

  // Logout action route
  route("logout", "./routes/logout.tsx"),
] satisfies RouteConfig;
