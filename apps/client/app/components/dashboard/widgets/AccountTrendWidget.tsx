import { useId, useMemo } from "react";
import { useDashboardAccountTrend } from "~/lib/dashboard/data-context";
import { formatCurrency } from "~/lib/utils";

const VIEWBOX_W = 320;
const VIEWBOX_H = 120;
const PAD_X = 4;
const PAD_Y = 6;

export function AccountTrendWidget() {
  const accountTrend = useDashboardAccountTrend();
  const clipId = useId();

  const { lines, latestTotal, deltaTotal, axisLabels } = useMemo(() => {
    const series = accountTrend.series;
    if (series.length === 0 || (series[0]?.points.length ?? 0) === 0) {
      return {
        lines: [],
        latestTotal: 0,
        deltaTotal: 0,
        axisLabels: [
          { id: "top", value: 0 },
          { id: "mid", value: 0 },
          { id: "bottom", value: 0 },
        ],
      };
    }
    const allBalances = series.flatMap((s) => s.points.map((p) => p.balance));
    const min = Math.min(...allBalances);
    const max = Math.max(...allBalances);
    const midpoint = min + (max - min) / 2;
    const range = max - min || 1;
    const len = series[0].points.length;
    const step = (VIEWBOX_W - PAD_X * 2) / Math.max(len - 1, 1);

    const built = series.map((s) => {
      const coords = s.points.map((p, i) => {
        const x = PAD_X + i * step;
        const y = VIEWBOX_H - PAD_Y - ((p.balance - min) / range) * (VIEWBOX_H - PAD_Y * 2);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      const latest = s.points[s.points.length - 1]?.balance ?? 0;
      const first = s.points[0]?.balance ?? 0;
      return {
        id: s.account_id,
        name: s.account_name,
        color: s.color,
        path: `M ${coords.join(" L ")}`,
        latest,
        delta: latest - first,
      };
    });

    const totalLatest = built.reduce((s, l) => s + l.latest, 0);
    const totalDelta = built.reduce((s, l) => s + l.delta, 0);
    return {
      lines: built,
      latestTotal: totalLatest,
      deltaTotal: totalDelta,
      axisLabels: [
        { id: "top", value: max },
        { id: "mid", value: midpoint },
        { id: "bottom", value: min },
      ],
    };
  }, [accountTrend]);

  const ccy = accountTrend.currency;
  const deltaTone = deltaTotal > 0 ? "up" : deltaTotal < 0 ? "down" : "flat";

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 pb-3.5 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M14 7h7v7" />
          </svg>
          Account trend
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted">
          {accountTrend.days}d
        </span>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-content-muted">
          No accounts to chart
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-content-heading tabular-nums">
              {formatCurrency(latestTotal, ccy, true, 0)}
            </span>
            <span
              className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums ${
                deltaTone === "up"
                  ? "bg-positive-bg text-positive-text-strong"
                  : deltaTone === "down"
                    ? "bg-negative-bg text-negative-text"
                    : "bg-surface-elevated text-content-tertiary"
              }`}
            >
              {deltaTotal > 0 ? "+" : ""}
              {formatCurrency(deltaTotal, ccy, true, 0)}
            </span>
          </div>

          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-md border border-edge-default bg-surface-elevated/65">
            <div className="flex h-full">
              <div className="flex w-14 shrink-0 flex-col justify-between px-2 py-2 text-[9px] font-medium tabular-nums text-content-muted">
                {axisLabels.map((label) => (
                  <div
                    key={label.id}
                    className={`flex items-center gap-1.5 ${label.id === "mid" ? "translate-y-1/2" : ""}`}
                  >
                    <span>{formatCurrency(label.value, ccy, true, 0)}</span>
                    <span className="h-px flex-1 bg-edge-default/28" />
                  </div>
                ))}
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="pointer-events-none absolute inset-x-0 top-[6px] border-t border-edge-default/40" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-edge-default/35" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[6px] border-t border-edge-default/40" />
                <svg
                  viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                  preserveAspectRatio="none"
                  className="h-full w-full"
                >
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={0} y={0} width={VIEWBOX_W} height={VIEWBOX_H} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${clipId})`}>
                    {lines.map((line) => (
                      <path
                        key={line.id}
                        d={line.path}
                        fill="none"
                        stroke={line.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.92}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            </div>
          </div>

          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-edge-default/80 pt-2 text-[10px]">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-1.5 text-content-tertiary">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: line.color }} />
                <span className="truncate font-medium text-content-secondary">{line.name}</span>
                <span className="tabular-nums text-content-muted">
                  {formatCurrency(line.latest, ccy, true, 0)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
