import * as Sentry from "@sentry/react";

export function initSentry() {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "production",
    sampleRate: 1.0,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: [/^\/api\//],
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.Authorization;
        }
      }
      return breadcrumb;
    },
  });
}
