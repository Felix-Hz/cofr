import * as Sentry from "@sentry/react";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { initSentry } from "./lib/sentry";

initSentry();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});

// The static landing site has no app shell to cache: drop any worker left over from the hosted app.
if ("serviceWorker" in navigator && import.meta.env.VITE_LANDING === "1") {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) registration.unregister();
  });
}

// Register service worker (production only)
if ("serviceWorker" in navigator && import.meta.env.PROD && import.meta.env.VITE_LANDING !== "1") {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      // Check for updates every 60 minutes
      setInterval(() => registration.update(), 60 * 60 * 1000);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("cofr:sw-update", { detail: registration }));
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (e) {
      console.warn("SW registration failed:", e);
      Sentry.captureException(e);
    }
  });
}
