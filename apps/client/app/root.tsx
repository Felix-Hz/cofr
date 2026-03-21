import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import "./globals.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cofr</title>
        <meta name="theme-color" content="#0B1220" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F9FAFB" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="/theme.js" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const isRoute = isRouteErrorResponse(error);

  let status = 500;
  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";

  if (isRoute) {
    status = error.status;
    switch (status) {
      case 404:
        title = "Page not found";
        message = "This page doesn't exist or has been moved.";
        break;
      case 403:
        title = "Access denied";
        message = "You don't have permission to view this page.";
        break;
      default:
        title = error.statusText || "Error";
        message = `The server returned a ${status} error.`;
    }
  }

  const is404 = status === 404;

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center max-w-sm w-full">
        <Link to="/" className="mb-16">
          <img src="/logo.png" alt="Cofr" className="logo-auto h-7" />
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-content-tertiary mb-4">
          {status}
        </p>

        <div className="w-8 h-px bg-edge-strong mb-6" />

        <h1 className="text-[17px] font-semibold text-content-primary mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-[13px] leading-relaxed text-content-tertiary text-center mb-10">
          {message}
        </p>

        <div className="flex items-center gap-6">
          {!is404 && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 px-4 inline-flex items-center text-[13px] font-medium rounded-lg bg-emerald text-white hover:bg-emerald-hover transition-colors"
            >
              Try again
            </button>
          )}
          <Link
            to="/dashboard"
            className={`h-9 px-4 inline-flex items-center text-[13px] font-medium rounded-lg transition-opacity ${
              is404
                ? "bg-content-primary text-surface-primary hover:opacity-90"
                : "border border-edge-strong text-content-primary hover:bg-surface-elevated"
            }`}
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-[13px] font-medium text-content-tertiary hover:text-content-primary transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
