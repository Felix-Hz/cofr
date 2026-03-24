/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// API requests: network-only (fail when offline, no stale data)
registerRoute(({ url }) => url.pathname.startsWith("/api/"), new NetworkOnly());

// Static assets (fonts, images): cache-first
registerRoute(
  ({ request }) =>
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style",
  new CacheFirst({ cacheName: "static-assets" }),
);

// Navigation: serve cached index.html for all non-API navigation
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//],
  }),
);

// Accept skip-waiting message from client for update flow
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
