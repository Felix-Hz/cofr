import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    reactRouter(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "app",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "cofr",
        short_name: "cofr",
        description: "Track spending and understand your money with clarity.",
        theme_color: "#0B1220",
        background_color: "#0B1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        additionalManifestEntries: [{ url: "/index.html", revision: Date.now().toString() }],
        globPatterns: ["**/*.{js,css,html,png,ico,svg,woff,woff2}"],
      },
      devOptions: {
        enabled: false,
      },
    }),
    process.env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: "cofr-client",
          authToken: process.env.SENTRY_AUTH_TOKEN,
          sourcemaps: {
            filesToDeleteAfterUpload: ["./build/client/**/*.map"],
          },
        })
      : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "~": "/app",
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".ngrok.io",
      ".ngrok-free.app",
      "cofr.cash",
      "www.cofr.cash",
    ],
  },
});
