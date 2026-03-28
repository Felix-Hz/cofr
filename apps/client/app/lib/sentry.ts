import * as Sentry from "@sentry/react";

function buildTracePropagationTargets(): Array<string | RegExp> {
  const targets: Array<string | RegExp> = [/^\/api\//];
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    return targets;
  }

  const resolvedApiUrl = new URL(apiBaseUrl, window.location.origin);
  targets.push(resolvedApiUrl.origin);
  targets.push(`${resolvedApiUrl.origin}${resolvedApiUrl.pathname}`);

  return targets;
}

export function initSentry() {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "production",
    sampleRate: 1.0,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: buildTracePropagationTargets(),
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
