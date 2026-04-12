import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { PeriodStats4UpWidget } from "./PeriodStats4UpWidget";

const useDashboardData = vi.fn();

vi.mock("~/lib/dashboard/data-context", () => ({
  useDashboardData: () => useDashboardData(),
}));

describe("PeriodStats4UpWidget", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
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
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders a two-row layout with inline pills for net and savings", async () => {
    await act(async () => {
      root.render(
        React.createElement(PeriodStats4UpWidget, {
          widget: { row_span: 1 },
          isEditMode: false,
        } as never),
      );
    });

    const labels = [...container.querySelectorAll("span")]
      .map((element) => element.textContent)
      .filter(Boolean);
    const pills = [...container.querySelectorAll(".rounded-full")].map(
      (element) => element.textContent,
    );

    expect(labels).toContain("Income");
    expect(labels).toContain("Spent");
    expect(labels).toContain("Net");
    expect(labels).toContain("Savings");
    expect(pills).toEqual(["+68%", "NZ$450"]);
  });
});
