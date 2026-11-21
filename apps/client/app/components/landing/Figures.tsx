import { INK, IsoArt, MARK } from "~/lib/iso-art";

// ── Isometric figures: real objects from the product, ink-3 hairlines, one cobalt part ──

const FILL: Record<number, string> = {
  1: "var(--sm-ink-3)",
  2: "var(--sm-accent)",
  3: "var(--sm-paper)",
};

function IsoFigure({ art, label, scale = 2 }: { art: IsoArt; label: string; scale?: number }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${art.w} ${art.h}`}
      width={art.w * scale}
      height={art.h * scale}
      shapeRendering="crispEdges"
      className="block max-w-full h-auto"
    >
      {art.runs().map(([x, y, w, v]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={FILL[v]} />
      ))}
    </svg>
  );
}

/** Seventeen statement rows stacked by shop: Corner Grocer ×6, City Bus ×9, Payroll ×2. */
export function importArt(): IsoArt {
  const art = new IsoArt(166, 68);
  const counts = [6, 9, 2];
  counts.forEach((count, k) => {
    for (let j = 0; j < count; j++)
      art.box(27 + 56 * k, 41 - 4 * j, 12, 12, 1, k === 1 ? MARK : INK);
  });
  return art;
}

/** Four export files standing in a row; the ZIP that holds the rest in cobalt. */
export function exportArt(): IsoArt {
  const art = new IsoArt(104, 70);
  for (let i = 0; i < 4; i++) art.box(32 + i * 10, 21 + i * 5, 2, 14, 18, i === 3 ? MARK : INK);
  return art;
}

/** Two coin stacks: the foreign amount, and what it is worth at home in cobalt. */
export function currencyArt(): IsoArt {
  const art = new IsoArt(90, 44);
  for (let j = 0; j < 6; j++) art.box(20, 26 - 4 * j, 8, 8, 1, INK);
  for (let j = 0; j < 2; j++) art.box(68, 26 - 4 * j, 8, 8, 1, MARK);
  return art;
}

/** Six category bins on a grid; the one you added stands taller, in cobalt. */
export function categoriesArt(): IsoArt {
  const art = new IsoArt(84, 50);
  const cells: [number, number][] = [];
  for (let gx = 0; gx < 3; gx++) for (let gy = 0; gy < 2; gy++) cells.push([gx, gy]);
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [gx, gy] of cells) {
    const mine = gx === 2 && gy === 0;
    art.box(32 + 18 * gx - 18 * gy, 7 + 9 * gx + 9 * gy, 6, 6, mine ? 10 : 6, mine ? MARK : INK);
  }
  return art;
}

/** A board of widgets at different heights; the one you just moved in cobalt. */
export function dashboardArt(): IsoArt {
  const art = new IsoArt(94, 56);
  const ox = 38;
  const oy = 8;
  art.box(ox, oy, 26, 18, 1, INK);
  const widgets: [number, number, number, number, number, boolean][] = [
    [2, 2, 10, 6, 2, false],
    [14, 2, 10, 6, 5, true],
    [2, 10, 22, 6, 3, false],
  ];
  for (const [x, y, a, b, h, moved] of widgets) {
    art.box(ox + 2 * x - 2 * y, oy + x + y - 1, a, b, h, moved ? MARK : INK);
  }
  return art;
}

/** A phone lying flat with its home screen; cofr's tile in cobalt. */
export function phoneArt(): IsoArt {
  const art = new IsoArt(74, 42);
  const ox = 47;
  const oy = 4;
  art.box(ox, oy, 12, 22, 2, INK);
  const tiles: [number, number][] = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) tiles.push([1 + 4 * c, 2 + 5 * r]);
  tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [x, y] of tiles) {
    art.box(ox + 2 * x - 2 * y, oy + x + y - 2, 2, 2, 1, x === 9 && y === 17 ? MARK : INK);
  }
  return art;
}

export function CurrencyFigure() {
  return (
    <IsoFigure art={currencyArt()} label="A tall stack of coins beside a short cobalt stack, the same value at home" />
  );
}

export function CategoriesFigure() {
  return <IsoFigure art={categoriesArt()} label="Six bins on a grid, one taller and in cobalt" />;
}

export function DashboardFigure() {
  return <IsoFigure art={dashboardArt()} label="A board with four widget blocks of different heights, one in cobalt" />;
}

export function PhoneFigure() {
  return <IsoFigure art={phoneArt()} label="A phone lying flat with a grid of app tiles, one in cobalt" />;
}

export function ImportFigure() {
  return (
    <IsoFigure
      art={importArt()}
      label="Three stacks of statement rows, six, nine and two high; the stack of nine in cobalt"
    />
  );
}

export function ExportFigure() {
  return <IsoFigure art={exportArt()} label="Four upright files in a row, the last in cobalt" />;
}

// ── Widget illustrations, from example data ──

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const INCOME = [4230, 4230, 4380, 4230, 4230, 4610];
const SPENT = [3120, 3540, 2890, 4410, 3010, 2627];

const money = (v: number) => `$${v.toLocaleString("en-NZ")}`;

/** The finding, from the data: how many months spending stayed under income. */
export function trendFinding(income: number[], spent: number[]): string {
  const under = spent.filter((s, i) => s < (income[i] ?? 0)).length;
  return `Spending stayed under income in ${under} of ${spent.length} months`;
}

/** Monthly trend bars: income in slot 1, spending in slot 2, one axis, values on hover. */
export function TrendBarsFigure() {
  const W = 320;
  const H = 150;
  const left = 34;
  const right = W - 4;
  const top = 6;
  const bottom = H - 20;
  const max = 5000;
  const toY = (v: number) => bottom - (v / max) * (bottom - top);
  const band = (right - left) / MONTHS.length;
  const bar = Math.min(12, band / 3);
  return (
    <div>
      <p className="font-display text-[17px] leading-snug text-content-heading">
        {trendFinding(INCOME, SPENT)}.
      </p>
      <p className="label mt-1">Monthly totals · NZD · example data</p>
      <div className="mt-3 flex gap-4 text-[12.5px] text-content-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 bg-data-1" aria-hidden="true" />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 bg-data-2" aria-hidden="true" />
          Spending
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full h-auto"
        role="img"
        aria-label={`Income and spending by month, June to November. ${trendFinding(INCOME, SPENT)}; September was the exception.`}
      >
        {[0, 2500, 5000].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={right}
              y1={toY(v)}
              y2={toY(v)}
              stroke="var(--sm-rule)"
              strokeWidth={1}
            />
            <text
              x={left - 6}
              y={toY(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-3 font-mono text-[9.5px]"
            >
              {v === 0 ? "0" : `${v / 1000}k`}
            </text>
          </g>
        ))}
        {MONTHS.map((m, i) => {
          const cx = left + band * i + band / 2;
          const inc = INCOME[i] ?? 0;
          const sp = SPENT[i] ?? 0;
          return (
            <g key={m}>
              <rect
                x={cx - bar - 1}
                y={toY(inc)}
                width={bar}
                height={bottom - toY(inc)}
                fill="var(--sm-data-1)"
              >
                <title>{`${m}: income ${money(inc)}`}</title>
              </rect>
              <rect
                x={cx + 1}
                y={toY(sp)}
                width={bar}
                height={bottom - toY(sp)}
                fill="var(--sm-data-2)"
              >
                <title>{`${m}: spending ${money(sp)}`}</title>
              </rect>
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className="fill-ink-3 font-mono text-[9.5px] uppercase"
              >
                {m}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="var(--sm-ink)" strokeWidth={1} />
      </svg>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKS = 10;

// Daily spending for ten weeks, seeded so the page prerenders the same every time
function heatData(): number[][] {
  let seed = 20261121;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const base = [34, 28, 31, 42, 66, 104, 58];
  return DAYS.map((_, d) =>
    Array.from({ length: WEEKS }, () => Math.round((base[d] ?? 40) * (0.45 + rand() * 1.1))),
  );
}

/** The weekday with the highest average, from the grid. */
export function heatFinding(grid: number[][]): string {
  const means = grid.map((row) => row.reduce((s, v) => s + v, 0) / row.length);
  const top = means.indexOf(Math.max(...means));
  const others = means.filter((_, i) => i !== top);
  const ratio = (means[top] ?? 0) / (others.reduce((s, v) => s + v, 0) / others.length);
  return `${DAY_NAMES[top]}s cost ${ratio.toFixed(1)} times the other days`;
}

/** Weekday heatmap on the sequential ramp, 1.5 px paper gaps, mono axis labels. */
export function HeatmapFigure() {
  const grid = heatData();
  const max = Math.max(...grid.flat());
  const cell = 30;
  const gap = 1.5;
  const left = 42;
  const W = left + WEEKS * cell;
  const H = DAYS.length * cell + 22;
  const step = (v: number) => Math.min(7, 1 + Math.floor((v / max) * 6.999));
  return (
    <div>
      <p className="font-display text-[17px] leading-snug text-content-heading">
        {heatFinding(grid)}.
      </p>
      <p className="label mt-1">Daily spending · last 10 weeks · example data</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full h-auto max-w-[26rem]"
        role="img"
        aria-label={`Spending by weekday over ten weeks. ${heatFinding(grid)}.`}
      >
        {grid.map((row, d) => (
          <g key={DAYS[d]}>
            <text
              x={0}
              y={d * cell + cell / 2}
              dominantBaseline="middle"
              className="fill-ink-3 font-mono text-[11px] uppercase"
            >
              {DAYS[d]}
            </text>
            {row.map((v, w) => (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, positions never move
                key={w}
                x={left + w * cell}
                y={d * cell}
                width={cell - gap}
                height={cell - gap}
                fill={`var(--sm-seq-${step(v)})`}
              >
                <title>{`${DAYS[d]}, week ${w + 1}: ${money(v)}`}</title>
              </rect>
            ))}
          </g>
        ))}
        <text x={left} y={H - 4} className="fill-ink-3 font-mono text-[11px] uppercase">
          10 weeks ago
        </text>
        <text
          x={W - gap}
          y={H - 4}
          textAnchor="end"
          className="fill-ink-3 font-mono text-[11px] uppercase"
        >
          This week
        </text>
      </svg>
    </div>
  );
}
