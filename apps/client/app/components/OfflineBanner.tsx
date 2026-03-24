import { useOnlineStatus } from "~/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-warning-bg border-b border-warning-border px-4 py-2 text-center">
      <span className="text-xs font-medium text-warning-text">
        You're offline. Some features may be unavailable.
      </span>
    </div>
  );
}
