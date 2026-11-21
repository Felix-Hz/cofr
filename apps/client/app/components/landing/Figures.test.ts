import { describe, expect, it } from "vitest";
import { MARK } from "~/lib/iso-art";
import {
  categoriesArt,
  currencyArt,
  dashboardArt,
  exportArt,
  heatFinding,
  importArt,
  phoneArt,
  trendFinding,
} from "./Figures";

describe("findings", () => {
  it("counts the months spending stayed under income", () => {
    expect(trendFinding([10, 10, 10], [5, 12, 9])).toBe(
      "Spending stayed under income in 2 of 3 months",
    );
  });

  it("names the costliest weekday against the rest", () => {
    const grid = [[10], [10], [10], [10], [10], [30], [10]];
    expect(heatFinding(grid)).toBe("Saturdays cost 3.0 times the other days");
  });
});

describe("figures", () => {
  it("draw one cobalt part inside the buffer, with nothing on the edges", () => {
    for (const art of [importArt(), exportArt(), currencyArt(), categoriesArt(), dashboardArt(), phoneArt()]) {
      expect(art.px.some((v) => v === MARK)).toBe(true);
      for (let x = 0; x < art.w; x++) {
        expect(art.get(x, 0)).toBe(0);
        expect(art.get(x, art.h - 1)).toBe(0);
      }
      for (let y = 0; y < art.h; y++) {
        expect(art.get(0, y)).toBe(0);
        expect(art.get(art.w - 1, y)).toBe(0);
      }
    }
  });

  it("merges pixels into runs that cover every set pixel once", () => {
    const art = importArt();
    const covered = art.runs().reduce((n, [, , w]) => n + w, 0);
    expect(covered).toBe(art.px.filter((v) => v !== 0).length);
  });
});
