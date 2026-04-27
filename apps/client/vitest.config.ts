import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": new URL("./app", import.meta.url).pathname },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    globals: true,
    pool: "threads",
  },
});
