import { useEffect, useRef } from "react";
import { removeToken } from "~/lib/auth";

const LAST_ACTIVITY_KEY = "cofr_last_activity";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
const THROTTLE_MS = 30_000; // Only reset timer once per 30s

function logout() {
  removeToken();
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem("cofr_session_timeout");
  window.location.href = "/login";
}

export function useSessionTimeout(timeoutMinutes: number | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    // null = default 15min, 0 = disabled
    if (timeoutMinutes === 0) return;

    const ms = (timeoutMinutes ?? 15) * 60 * 1000;

    // Check if already timed out (cross-tab or page reload)
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - Number(lastActivity);
      if (elapsed >= ms) {
        logout();
        return;
      }
    }

    function resetTimer() {
      const now = Date.now();
      // Throttle: skip if last reset was within THROTTLE_MS
      if (now - lastResetRef.current < THROTTLE_MS) return;
      lastResetRef.current = now;

      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, ms);
    }

    // Reset throttle so the timer starts immediately on config change
    lastResetRef.current = 0;
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, resetTimer);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMinutes]);
}
