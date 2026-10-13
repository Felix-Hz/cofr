import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

// Evaluated by React Router at build time in Node; the app tsconfig only has browser types.
declare const process: { env: Record<string, string | undefined> };

// The static cofr.cash landing (VITE_LANDING=1) ships only the public pages: no login or app routes.
const landingRoutes = [
  index("./routes/landing.tsx"),
  route("terms", "./routes/terms.tsx"),
  route("privacy", "./routes/privacy.tsx"),
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;

const appRoutes = [
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

  // Legal pages
  route("terms", "./routes/terms.tsx"),
  route("privacy", "./routes/privacy.tsx"),

  // Logout action route
  route("logout", "./routes/logout.tsx"),

  // Catch-all: renders the root ErrorBoundary for unmatched routes
  route("*", "./routes/catch-all.tsx"),
] satisfies RouteConfig;

export default (process.env.VITE_LANDING === "1" ? landingRoutes : appRoutes) satisfies RouteConfig;
