import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { WeekdayHeatmapWidget } from "./WeekdayHeatmapWidget";

const useDashboardWeekdayHeatmap = vi.fn();

vi.mock("~/lib/dashboard/data-context", () => ({
  useDashboardWeekdayHeatmap: () => useDashboardWeekdayHeatmap(),
}));

describe("WeekdayHeatmapWidget", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useDashboardWeekdayHeatmap.mockReturnValue({
      currency: "NZD",
      weeks: 3,
      is_converted: false,
      cells: Array.from({ length: 21 }, (_, index) => ({
        week: Math.floor(index / 7),
        weekday: index % 7,
        total: index + 1,
      })),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders each day label inside the matching weekday row", async () => {
    await act(async () => {
      root.render(React.createElement(WeekdayHeatmapWidget));
    });

    const rowDays = [...container.querySelectorAll("[data-weekday-row]")].map((row) =>
      row.getAttribute("data-weekday-row"),
    );
    const labelDays = [...container.querySelectorAll("[data-weekday-label]")].map((label) =>
      label.getAttribute("data-weekday-label"),
    );
    const labelText = [...container.querySelectorAll("[data-weekday-label]")].map(
      (label) => label.textContent,
    );

    expect(rowDays).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(labelDays).toEqual(rowDays);
    expect(labelText).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });
});
