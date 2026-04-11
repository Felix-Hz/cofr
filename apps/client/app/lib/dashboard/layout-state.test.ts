import { describe, expect, it } from "vitest";
import type { DashboardSpace } from "../schemas";
import {
  buildDashboardLayoutUpdate,
  createDashboardSpace,
  normalizeDashboardSpaces,
  removeDashboardSpace,
} from "./layout-state";

const makeSpace = (
  id: string,
  name: string,
  position: number,
  is_default = false,
): DashboardSpace => ({
  id,
  name,
  position,
  is_default,
  widgets: [],
});

describe("normalizeDashboardSpaces", () => {
  it("reindexes positions and keeps one default space", () => {
    const spaces = normalizeDashboardSpaces([
      makeSpace("one", "Overview", 4, true),
      makeSpace("two", "Wealth", 9, true),
    ]);

    expect(spaces.map((space) => space.position)).toEqual([0, 1]);
    expect(spaces.filter((space) => space.is_default).map((space) => space.id)).toEqual(["one"]);
  });
});

describe("createDashboardSpace", () => {
  it("creates a unique sequential name", () => {
    const next = createDashboardSpace(
      [makeSpace("one", "Space 1", 0, true), makeSpace("two", "Space 2", 1)],
      "three",
    );

    expect(next.name).toBe("Space 3");
    expect(next.widgets).toEqual([]);
  });

  it("skips already-taken sequential names when adding another space", () => {
    const next = createDashboardSpace(
      [
        makeSpace("one", "Overview", 0, true),
        makeSpace("two", "Space 2", 1),
        makeSpace("three", "Space 3", 2),
      ],
      "four",
    );

    expect(next.name).toBe("Space 4");
  });
});

describe("removeDashboardSpace", () => {
  it("promotes the first remaining space when the default is removed", () => {
    const spaces = removeDashboardSpace(
      [makeSpace("one", "Overview", 0, true), makeSpace("two", "Wealth", 1)],
      "one",
    );

    expect(spaces).toHaveLength(1);
    expect(spaces[0].id).toBe("two");
    expect(spaces[0].is_default).toBe(true);
    expect(spaces[0].position).toBe(0);
  });
});

describe("buildDashboardLayoutUpdate", () => {
  it("trims names and falls back for blank space names", () => {
    const payload = buildDashboardLayoutUpdate([
      makeSpace("one", "   ", 7, true),
      makeSpace("two", "Wealth", 9),
    ]);

    expect(payload.spaces.map((space) => space.name)).toEqual(["Space 1", "Wealth"]);
    expect(payload.spaces.map((space) => space.position)).toEqual([0, 1]);
  });
});
