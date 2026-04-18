import { useId, useMemo } from "react";
import { useDashboardSparkline } from "~/lib/dashboard/data-context";
import type { WidgetRenderProps } from "~/lib/dashboard/registry";
import { formatCurrency } from "~/lib/utils";

const VIEWBOX_W = 320;
const VIEWBOX_H = 64;
const PAD = 4;

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SpendSparklineWidget({ widget }: WidgetRenderProps) {
  const sparkline = useDashboardSparkline();
  const strokeGradientId = useId();
  const markerGradientId = useId();
  const isCompact = widget.row_span <= 2;
  const lineStrokeWidth = isCompact ? 2.25 : 2.75;
  const todayOuterRadius = isCompact ? 3.5 : 4.5;
  const todayInnerRadius = isCompact ? 2 : 2.5;
  const latestRadius = isCompact ? 2 : 2.5;
  const {
    path,
    total,
    peak,
    latest,
    average,
    change,
    changeTone,
    startLabel,
    endLabel,
    todayX,
    todayY,
    hasTodayInRange,
    isTodayLatest,
  } = useMemo(() => {
    const points = sparkline.points;
    if (points.length === 0) {
      return {
        path: "",
        total: 0,
        peak: 0,
        latest: 0,
        average: 0,
        change: 0,
        changeTone: "flat" as const,
        startLabel: "",
        endLabel: "",
        todayX: null as number | null,
        todayY: null as number | null,
        hasTodayInRange: false,
        isTodayLatest: false,
      };
    }
    const max = Math.max(...points.map((p) => p.total), 1);
    const step = (VIEWBOX_W - PAD * 2) / Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => {
      const x = PAD + i * step;
      const y = VIEWBOX_H - PAD - (p.total / max) * (VIEWBOX_H - PAD * 2);
      return { x, y, date: p.date };
    });
    const line = `M ${coords.map((point) => `${point.x},${point.y}`).join(" L ")}`;
    const latestPoint = points[points.length - 1]?.total ?? 0;
    const firstPoint = points[0]?.total ?? 0;
    const avg = points.reduce((sum, p) => sum + p.total, 0) / points.length;
    const delta = latestPoint - firstPoint;
    const todayKey = getTodayKey();
    const todayPoint = coords.find((point) => point.date === todayKey);
    const latestDate = points[points.length - 1]?.date ?? "";
    return {
      path: line,
      total: points.reduce((sum, p) => sum + p.total, 0),
      peak: max,
      latest: latestPoint,
      average: avg,
      change: delta,
      changeTone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      startLabel: points[0]?.date ?? "",
      endLabel: points[points.length - 1]?.date ?? "",
      todayX: todayPoint?.x ?? null,
      todayY: todayPoint?.y ?? null,
      hasTodayInRange: todayPoint !== undefined,
      isTodayLatest: latestDate === todayKey,
    };
  }, [sparkline]);
  return (
    <div className={`flex h-full flex-col overflow-hidden ${isCompact ? "p-3" : "p-4"}`}>
      <div className={`flex items-start ${isCompact ? "gap-2.5" : "justify-between gap-4"}`}>
        <div className="min-w-0 flex-1">
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
          <div className={`flex items-end gap-2 ${isCompact ? "mt-1.5" : "mt-3"}`}>
            <div
              className={`font-semibold tracking-tight text-content-heading tabular-nums ${isCompact ? "text-[1.75rem] leading-none" : "text-2xl"}`}
            >
              {formatCurrency(latest, sparkline.currency, true, 0)}
            </div>
            <span
              className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-medium leading-none tabular-nums ${
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
          <div
            className={`text-content-tertiary ${isCompact ? "mt-1 truncate text-[9px] leading-tight" : "mt-1 text-[11px]"}`}
          >
            Latest day vs first day in range
          </div>
        </div>

        <div
          className={`shrink-0 text-right ${isCompact ? "hidden w-[88px] gap-1.5 sm:grid" : "grid gap-2"}`}
        >
          <div
            className={`rounded-md border border-edge-default bg-surface-elevated/80 ${isCompact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-tertiary">
              Peak
            </div>
            <div
              className={`font-semibold text-content-primary tabular-nums ${isCompact ? "mt-0.5 text-[12px]" : "mt-1 text-sm"}`}
            >
              {formatCurrency(peak, sparkline.currency, true, 0)}
            </div>
          </div>
          <div
            className={`rounded-md border border-edge-default bg-surface-elevated/80 ${isCompact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-tertiary">
              Avg
            </div>
            <div
              className={`font-semibold text-content-primary tabular-nums ${isCompact ? "mt-0.5 text-[12px]" : "mt-1 text-sm"}`}
            >
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
        <div className={`relative flex min-h-0 flex-1 flex-col ${isCompact ? "mt-1.5" : "mt-4"}`}>
          <div
            className={`relative flex-1 overflow-hidden rounded-md border border-edge-default bg-surface-elevated/65 ${
              isCompact ? "min-h-[56px] px-2 py-1.5" : "min-h-[72px] px-3 py-3"
            }`}
          >
            <div
              className={`pointer-events-none absolute top-1/2 border-t border-dashed border-edge-default/70 ${isCompact ? "inset-x-2" : "inset-x-3"}`}
            />
            <div
              className={`pointer-events-none absolute border-t border-edge-default/55 ${isCompact ? "bottom-2 inset-x-2" : "bottom-3 inset-x-3"}`}
            />
            <svg
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="none"
              className="relative h-full w-full"
            >
              <defs>
                <linearGradient
                  id={strokeGradientId}
                  x1="0"
                  y1="0"
                  x2={VIEWBOX_W}
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.82" />
                  <stop offset="55%" stopColor="#10b981" stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.88" />
                </linearGradient>
                <linearGradient
                  id={markerGradientId}
                  x1="0"
                  y1={PAD}
                  x2="0"
                  y2={VIEWBOX_H - PAD}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              {hasTodayInRange && todayX !== null && !isTodayLatest ? (
                <line
                  x1={todayX}
                  y1={PAD}
                  x2={todayX}
                  y2={VIEWBOX_H - PAD}
                  stroke={`url(#${markerGradientId})`}
                  strokeWidth={1}
                />
              ) : null}
              <path
                d={path}
                fill="none"
                stroke={`url(#${strokeGradientId})`}
                strokeWidth={lineStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {hasTodayInRange &&
              todayX !== null &&
              todayY !== null &&
              !isTodayLatest &&
              todayY < VIEWBOX_H - PAD - 1 ? (
                <g>
                  <circle
                    cx={todayX}
                    cy={todayY}
                    r={todayOuterRadius}
                    fill="#ffffff"
                    fillOpacity={0.96}
                  />
                  <circle cx={todayX} cy={todayY} r={todayInnerRadius} fill="#059669" />
                  <circle cx={todayX} cy={todayY} r={10} fill="transparent">
                    <title>Today</title>
                  </circle>
                </g>
              ) : null}
              <circle
                cx={VIEWBOX_W - PAD}
                cy={VIEWBOX_H - PAD - (latest / Math.max(peak, 1)) * (VIEWBOX_H - PAD * 2)}
                r={latestRadius}
                fill="#059669"
                fillOpacity={0.92}
              />
            </svg>
          </div>

          {!isCompact ? (
            <div className="mt-2 flex items-center justify-between px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-content-tertiary">
              <span>{startLabel}</span>
              <span>{endLabel}</span>
            </div>
          ) : null}
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-3 border-t border-edge-default/80 ${isCompact ? "mt-1.5 pt-1.5" : "mt-3 pt-3"}`}
      >
        <div className={`${isCompact ? "text-[10px]" : "text-[11px]"} text-content-tertiary`}>
          {isCompact ? `${startLabel} – ${endLabel}` : "Range total"}
        </div>
        <div
          className={`font-semibold text-content-primary tabular-nums ${isCompact ? "text-[12px]" : "text-sm"}`}
        >
          {formatCurrency(total, sparkline.currency, true, 0)}
        </div>
      </div>
    </div>
  );
}
