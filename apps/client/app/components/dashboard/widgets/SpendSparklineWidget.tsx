import { useMemo } from "react";
import { useDashboardData } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const VIEWBOX_W = 320;
const VIEWBOX_H = 64;
const PAD = 4;

/**
 * Minimalist daily-spend sparkline. SVG polyline + gradient fill, no chart
 * library, so it stays cheap at any size.
 */
export function SpendSparklineWidget() {
  const { sparkline } = useDashboardData();
  const { path, areaPath, total, peak } = useMemo(() => {
    const points = sparkline.points;
    if (points.length === 0) {
      return { path: "", areaPath: "", total: 0, peak: 0 };
    }
    const max = Math.max(...points.map((p) => p.total), 1);
    const step = (VIEWBOX_W - PAD * 2) / Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => {
      const x = PAD + i * step;
      const y = VIEWBOX_H - PAD - (p.total / max) * (VIEWBOX_H - PAD * 2);
      return `${x},${y}`;
    });
    const line = `M ${coords.join(" L ")}`;
    const area = `${line} L ${PAD + (points.length - 1) * step},${VIEWBOX_H - PAD} L ${PAD},${VIEWBOX_H - PAD} Z`;
    return {
      path: line,
      areaPath: area,
      total: points.reduce((sum, p) => sum + p.total, 0),
      peak: max,
    };
  }, [sparkline]);

  return (
    <div className="flex h-full flex-col justify-between gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l2-6 4 12 2-6h7" />
          </svg>
          Spend pulse
        </div>
        <span className="text-[11px] text-content-tertiary tabular-nums">
          Peak {formatCurrency(peak, sparkline.currency, true, 0)}
        </span>
      </div>
      {sparkline.points.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          No spend yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#sparklineFill)" className="text-emerald" />
          <path d={path} fill="none" strokeWidth={2} className="stroke-emerald" />
        </svg>
      )}
      <div className="text-[11px] text-content-tertiary tabular-nums">
        {formatCurrency(total, sparkline.currency, true, 0)} total
      </div>
    </div>
  );
}
