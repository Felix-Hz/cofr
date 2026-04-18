/**
 * Detect whether the browser provides native pull-to-refresh in standalone PWA mode.
 * Chrome on Android does this automatically; Safari and Firefox do not.
 */
export function hasNativePullToRefresh(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (!isStandalone) return false;
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua);
}
