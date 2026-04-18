import { useEffect, useState } from "react";

export default function UpdateBanner() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setRegistration((e as CustomEvent<ServiceWorkerRegistration>).detail);
    };
    window.addEventListener("cofr:sw-update", handler);
    return () => window.removeEventListener("cofr:sw-update", handler);
  }, []);

  if (!registration?.waiting) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-surface-elevated border border-edge-default rounded-lg shadow-lg animate-toast-up"
      style={{ bottom: "calc(1rem + var(--safe-bottom))" }}
    >
      <span className="text-sm text-content-secondary">New version available</span>
      <button
        type="button"
        onClick={() => registration.waiting?.postMessage({ type: "SKIP_WAITING" })}
        className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
