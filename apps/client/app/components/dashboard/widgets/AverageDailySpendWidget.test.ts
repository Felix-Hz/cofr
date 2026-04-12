import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { AverageDailySpendWidget } from "./AverageDailySpendWidget";

const useDashboardData = vi.fn();

vi.mock("~/lib/dashboard/data-context", () => ({
  useDashboardData: () => useDashboardData(),
}));

describe("AverageDailySpendWidget", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useDashboardData.mockReturnValue({
      periodStats: {
        total_spent: 3891,
        total_income: 12009,
        transaction_count: 12,
        expense_count: 8,
        category_breakdown: [],
        currency: "NZD",
        is_converted: false,
        account_balances: [],
        savings_net_change: 450,
      },
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("counts elapsed and total days from calendar dates", async () => {
    vi.setSystemTime(new Date("2026-04-12T15:30:00+12:00"));

    await act(async () => {
      root.render(React.createElement(AverageDailySpendWidget));
    });

    expect(container.textContent).toContain("Day 12 / 30");
  });
});
