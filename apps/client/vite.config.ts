import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    reactRouter(),
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
