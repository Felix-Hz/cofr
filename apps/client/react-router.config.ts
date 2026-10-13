import type { Config } from "@react-router/dev/config";

// VITE_LANDING=1 builds only the public marketing pages as static HTML for S3/CloudFront.
const isLanding = process.env.VITE_LANDING === "1";

export default {
  // Disable SSR for now due to Bun compatibility
  ssr: false,
  prerender: isLanding ? ["/", "/terms", "/privacy"] : undefined,
} satisfies Config;
