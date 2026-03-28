import React, { act } from "react";
import { createRoot } from "react-dom/client";

import ExportHistoryTable from "./ExportHistoryTable";

const deleteExportRecord = vi.fn();
const getExportHistory = vi.fn();

vi.mock("~/lib/api", () => ({
  deleteExportRecord: (...args: unknown[]) => deleteExportRecord(...args),
  getExportHistory: (...args: unknown[]) => getExportHistory(...args),
  getExportRecordDownloadUrl: vi.fn((id: string) => `http://localhost/exports/${id}`),
}));

describe("ExportHistoryTable", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    deleteExportRecord.mockReset();
    getExportHistory.mockReset();
    getExportHistory.mockResolvedValue({
      exports: [
        {
          id: "exp-1",
          name: "Monthly Export",
          format: "csv",
          scope: "transactions",
          file_size: 1024,
          created_at: "2026-03-01T00:00:00Z",
          expires_at: "2026-09-01T00:00:00Z",
        },
      ],
      total_count: 1,
      limit: 15,
      offset: 0,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("adds an aria-label to download links", async () => {
    await act(async () => {
      root.render(React.createElement(ExportHistoryTable));
    });

    const toggle = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Export history"),
    );
    if (toggle == null) {
      throw new Error("Expected export history toggle");
    }

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const downloadLinks = [
      ...container.querySelectorAll('a[aria-label="Download export Monthly Export"]'),
    ];
    expect(downloadLinks.length).toBeGreaterThan(0);
  });

  it("shows an error when delete fails", async () => {
    deleteExportRecord.mockRejectedValue(new Error("delete failed"));

    await act(async () => {
      root.render(React.createElement(ExportHistoryTable));
    });

    const toggle = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Export history"),
    );
    if (toggle == null) {
      throw new Error("Expected export history toggle");
    }

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteButton = [...container.querySelectorAll('button[title="Delete"], button')].find(
      (button) => button.getAttribute("title") === "Delete",
    );
    expect(deleteButton).not.toBeNull();
    if (deleteButton == null) {
      throw new Error("Expected delete button");
    }

    await act(async () => {
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Yes" || button.textContent === "Confirm",
    );
    expect(confirmButton).not.toBeNull();
    if (confirmButton == null) {
      throw new Error("Expected confirm button");
    }

    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(deleteExportRecord).toHaveBeenCalledWith("exp-1");
    expect(container.textContent).toContain("Failed to delete export. Try again.");
  });
});
