import type { Config } from "@react-router/dev/config";

export default {
  // Disable SSR for now due to Bun compatibility
  ssr: false,
} satisfies Config;
