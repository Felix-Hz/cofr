import React, { act } from "react";
import { createRoot } from "react-dom/client";

import ExportModal from "./ExportModal";

const createExport = vi.fn();
const getExportHistory = vi.fn();

vi.mock("~/hooks/useBodyScrollLock", () => ({
  useBodyScrollLock: () => {},
}));

vi.mock("~/lib/api", () => ({
  createExport: (...args: unknown[]) => createExport(...args),
  getExportDownloadUrl: vi.fn(() => "http://localhost/download"),
  getExportHistory: (...args: unknown[]) => getExportHistory(...args),
  getExportRecordDownloadUrl: vi.fn(() => "http://localhost/history-download"),
  getExportStreamUrl: vi.fn(() => "http://localhost/stream"),
}));

describe("ExportModal", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    getExportHistory.mockResolvedValue({ exports: [], total_count: 0, limit: 3, offset: 0 });
    createExport.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("omits the name when the input is cleared after editing", async () => {
    createExport.mockRejectedValue(new Error("stop after payload"));

    await act(async () => {
      root.render(
        React.createElement(ExportModal, {
          isOpen: true,
          onClose: vi.fn(),
        }),
      );
    });

    const input = container.querySelector('input[type="text"]');
    const exportButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Export",
    );

    expect(input).not.toBeNull();
    expect(exportButton).not.toBeNull();
    if (!(input instanceof HTMLInputElement) || exportButton == null) {
      throw new Error("Expected export name input and export button");
    }

    await act(async () => {
      input.value = "Custom Export";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createExport).toHaveBeenCalledTimes(1);
    expect(createExport.mock.calls[0][0]).toMatchObject({
      format: "csv",
      scope: "transactions",
      name: undefined,
    });
  });
});
