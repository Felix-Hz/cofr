import { useId, useMemo } from "react";
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
  const gradientId = useId();
  const { path, areaPath, total, peak, latest, average, change, changeTone, startLabel, endLabel } =
    useMemo(() => {
      const points = sparkline.points;
      if (points.length === 0) {
        return {
          path: "",
          areaPath: "",
          total: 0,
          peak: 0,
          latest: 0,
          average: 0,
          change: 0,
          changeTone: "flat" as const,
          startLabel: "",
          endLabel: "",
        };
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
      const latestPoint = points[points.length - 1]?.total ?? 0;
      const firstPoint = points[0]?.total ?? 0;
      const avg = points.reduce((sum, p) => sum + p.total, 0) / points.length;
      const delta = latestPoint - firstPoint;
      return {
        path: line,
        areaPath: area,
        total: points.reduce((sum, p) => sum + p.total, 0),
        peak: max,
        latest: latestPoint,
        average: avg,
        change: delta,
        changeTone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
        startLabel: points[0]?.date ?? "",
        endLabel: points[points.length - 1]?.date ?? "",
      };
    }, [sparkline]);

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-edge-default bg-surface-elevated text-content-secondary">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l2-6 4 12 2-6h7" />
              </svg>
            </span>
            Spend pulse
          </div>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-2xl font-semibold tracking-tight text-content-heading tabular-nums">
              {formatCurrency(latest, sparkline.currency, true, 0)}
            </div>
            <span
              className={`mb-0.5 inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                changeTone === "up"
                  ? "bg-negative-bg text-negative-text"
                  : changeTone === "down"
                    ? "bg-positive-bg text-positive-text-strong"
                    : "bg-surface-elevated text-content-tertiary"
              }`}
            >
              {change > 0 ? "+" : ""}
              {formatCurrency(change, sparkline.currency, true, 0)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-content-tertiary">
            Latest day vs first day in range
          </div>
        </div>

        <div className="grid shrink-0 gap-2 text-right">
          <div className="rounded-md border border-edge-default bg-surface-elevated/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-tertiary">
              Peak
            </div>
            <div className="mt-1 text-sm font-semibold text-content-primary tabular-nums">
              {formatCurrency(peak, sparkline.currency, true, 0)}
            </div>
          </div>
          <div className="rounded-md border border-edge-default bg-surface-elevated/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-tertiary">
              Avg
            </div>
            <div className="mt-1 text-sm font-semibold text-content-primary tabular-nums">
              {formatCurrency(average, sparkline.currency, true, 0)}
            </div>
          </div>
        </div>
      </div>

      {sparkline.points.length === 0 ? (
        <div className="relative flex flex-1 items-center justify-center text-xs text-content-muted">
          No spend yet
        </div>
      ) : (
        <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-hidden rounded-md border border-edge-default bg-surface-elevated/65 px-3 py-3">
            <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-dashed border-edge-default/70" />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 border-t border-edge-default/55" />
            <svg
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="none"
              className="relative h-full w-full"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradientId})`} className="text-emerald" />
              <path
                d={path}
                fill="none"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-emerald"
              />
            </svg>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-content-tertiary">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge-default/80 pt-3">
        <div className="text-[11px] text-content-tertiary">Range total</div>
        <div className="text-sm font-semibold text-content-primary tabular-nums">
          {formatCurrency(total, sparkline.currency, true, 0)}
        </div>
      </div>
    </div>
  );
}
