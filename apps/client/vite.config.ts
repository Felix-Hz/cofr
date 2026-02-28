import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": "/app",
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    allowedHosts: ["localhost", "127.0.0.1", ".ngrok.io", ".ngrok-free.app", "uitzicht.online"],
  },
});
