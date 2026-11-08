import { IS_LANDING } from "~/lib/constants";

// Cookieless analytics (Felix-Hz/beacon) on the cofr.cash landing only. IS_LANDING is replaced
// at build time, so self-hosted builds contain neither the tag nor the URL.
export default function LandingAnalytics() {
  if (!IS_LANDING) return null;
  return <script defer src="https://e.felix-hzv.dev/b.js" />;
}
