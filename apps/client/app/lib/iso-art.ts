// Seamount figures: 2:1 isometric hairlines on a pixel grid. +x runs 2 right and 1 down, +y 2 left and 1
// down, +z straight up, so every edge lands on whole pixels and the drawing stays crisp at any whole scale.
// Pixels are merged into runs and emitted as rects, so a figure prerenders as SVG and takes its colours
// from the theme tokens.

export const INK = 1; // edges, ink-3
export const MARK = 2; // the one part the caption is about, cobalt
const PAPER = 3; // face fill that hides what is behind

export class IsoArt {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
  }

  set(x: number, y: number, v: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = v;
  }

  get(x: number, y: number): number {
    return this.px[y * this.w + x] ?? 0;
  }

  /** Bresenham; 2:1 deltas give clean two-pixel runs. */
  line(x0: number, y0: number, x1: number, y1: number, v: number): void {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, v);
      if (x === x1 && y === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y += sy;
      }
    }
  }

  /** Even-odd scanline fill at pixel centres. */
  fill(pts: [number, number][], v: number): void {
    for (let y = 0; y < this.h; y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i] as [number, number];
        const [bx, by] = pts[(i + 1) % pts.length] as [number, number];
        if (ay <= yc !== by <= yc) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (
          let x = Math.ceil((xs[k] as number) - 0.5);
          x <= Math.floor((xs[k + 1] as number) - 0.5);
          x++
        ) {
          this.set(x, y, v);
        }
      }
    }
  }

  /**
   * A box whose near top corner sits at (ox, oy): a along +x, b along +y, h tall. Draw far to near (lower
   * x + y first, then lower z), so nearer boxes paint over farther ones.
   */
  box(ox: number, oy: number, a: number, b: number, h: number, edge: number): void {
    const P = (x: number, y: number, z: number): [number, number] => [
      ox + 2 * x - 2 * y,
      oy + x + y - z,
    ];
    const t = [P(0, 0, h), P(a, 0, h), P(a, b, h), P(0, b, h)] as const;
    const f = [P(a, 0, 0), P(a, b, 0), P(0, b, 0)] as const;
    this.fill([t[0], t[1], f[0], f[1], f[2], t[3]], PAPER);
    const L = (p: [number, number], q: [number, number]): void =>
      this.line(p[0], p[1], q[0], q[1], edge);
    L(t[0], t[1]);
    L(t[1], t[2]);
    L(t[2], t[3]);
    L(t[3], t[0]);
    L(t[1], f[0]);
    L(t[2], f[1]);
    L(t[3], f[2]);
    L(f[0], f[1]);
    L(f[1], f[2]);
  }

  /** Horizontal runs of one value, as [x, y, width, value]. */
  runs(): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const v = this.get(x, y);
        let end = x + 1;
        while (end < this.w && this.get(end, y) === v) end++;
        if (v === INK || v === MARK || v === PAPER) out.push([x, y, end - x, v]);
        x = end;
      }
    }
    return out;
  }
}

export const PAPER_VALUE = PAPER;
