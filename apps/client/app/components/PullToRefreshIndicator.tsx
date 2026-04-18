const THRESHOLD = 80;

export default function PullToRefreshIndicator({
  pullDistance,
  refreshing,
}: {
  pullDistance: number;
  refreshing: boolean;
}) {
  if (pullDistance <= 0 && !refreshing) return null;

  const progress = Math.min(1, pullDistance / THRESHOLD);
  const rotation = progress * 270;

  return (
    <div
      className="ptr-indicator"
      style={{
        top: `calc(var(--safe-top) + ${Math.max(8, pullDistance * 0.35)}px)`,
        opacity: refreshing ? 1 : progress,
      }}
      aria-hidden="true"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={refreshing ? "ptr-spin" : ""}
        style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
      >
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {progress > 0.5 && (
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ opacity: Math.min(1, (progress - 0.5) * 2) }}
          />
        )}
      </svg>
    </div>
  );
}
