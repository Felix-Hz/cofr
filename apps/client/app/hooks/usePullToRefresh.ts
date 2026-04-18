import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 80;
const MAX_PULL = 120;
const RESISTANCE = 0.4;

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
}

export function usePullToRefresh(options?: { disabled?: boolean }): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  });

  const startY = useRef(0);
  const isPulling = useRef(false);
  const disabled = options?.disabled ?? false;

  const resetPull = useCallback(() => {
    isPulling.current = false;
    setState({ pulling: false, pullDistance: 0, refreshing: false });
  }, []);

  useEffect(() => {
    if (disabled) return;

    function isScrolledToTop(): boolean {
      return document.documentElement.scrollTop <= 0 && document.body.scrollTop <= 0;
    }

    function isDndActive(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      // WidgetDndShell sets touch-action: none on its wrapper when in edit mode
      const dndEl = target.closest("[style*='touch-action']");
      if (!dndEl) return false;
      const style = (dndEl as HTMLElement).style.touchAction;
      return style === "none";
    }

    function handleTouchStart(e: TouchEvent) {
      if (!isScrolledToTop()) return;
      if (isDndActive(e.target)) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (startY.current === 0) return;
      if (isDndActive(e.target)) return;

      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;

      // Only activate on downward pull when at top
      if (delta <= 0 || !isScrolledToTop()) {
        if (isPulling.current) resetPull();
        return;
      }

      // Start pulling
      if (!isPulling.current) {
        isPulling.current = true;
      }

      e.preventDefault();

      const pullDistance = Math.min(MAX_PULL, delta * RESISTANCE);
      setState({ pulling: true, pullDistance, refreshing: false });
    }

    function handleTouchEnd() {
      if (!isPulling.current) {
        startY.current = 0;
        return;
      }

      startY.current = 0;
      isPulling.current = false;

      setState((prev) => {
        if (prev.pullDistance >= THRESHOLD) {
          setTimeout(() => window.location.reload(), 300);
          return { pulling: false, pullDistance: prev.pullDistance, refreshing: true };
        }
        return { pulling: false, pullDistance: 0, refreshing: false };
      });
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, resetPull]);

  return state;
}
