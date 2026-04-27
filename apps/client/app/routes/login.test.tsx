import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./login";

// Mock react-router
vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement("a", { href: to }, children),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
  redirect: (path: string) => path,
}));

// Mock API
vi.mock("~/lib/api", () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  ApiError: class extends Error {
    status = 0;
  },
}));

// Mock Auth
vi.mock("~/lib/auth", () => ({
  isAuthenticated: () => false,
  saveToken: vi.fn(),
}));

describe("Login Captive Browser Check", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows an error when Google Login is clicked in a captive browser (Instagram)", async () => {
    // Mock Instagram User Agent
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 172.0.0.28.123",
    });

    await act(async () => {
      root.render(React.createElement(Login));
    });

    const googleButton = [...container.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Continue with Google"),
    );

    expect(googleButton).not.toBeUndefined();

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    const errorDiv = container.querySelector(".bg-negative-bg");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toContain("Google Login is blocked in this app's browser");
  });

  it("shows an error when Google Login is clicked in Reddit's captive browser", async () => {
    // Mock Reddit User Agent
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.146 Mobile Safari/537.36 Reddit/Version 2026.5.0",
    });

    await act(async () => {
      root.render(React.createElement(Login));
    });

    const googleButton = [...container.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Continue with Google"),
    );

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    const errorDiv = container.querySelector(".bg-negative-bg");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toContain("Google Login is blocked in this app's browser");
  });

  it("shows an error when Google Login is clicked in X (Twitter)'s captive browser", async () => {
    // Mock X (Twitter) User Agent
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter/10.1.0",
    });

    await act(async () => {
      root.render(React.createElement(Login));
    });

    const googleButton = [...container.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Continue with Google"),
    );

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    const errorDiv = container.querySelector(".bg-negative-bg");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toContain("Google Login is blocked in this app's browser");
  });

  it("allows Google Login in a standard browser (Chrome)", async () => {
    // Mock Chrome User Agent
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    await act(async () => {
      root.render(React.createElement(Login));
    });

    const googleButton = [...container.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Continue with Google"),
    );

    expect(googleButton).not.toBeUndefined();

    let defaultPrevented = false;
    googleButton?.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented) defaultPrevented = true;
      },
      { once: true },
    );

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(defaultPrevented).toBe(false);
    const errorDiv = container.querySelector(".bg-negative-bg");
    expect(errorDiv).toBeNull();
  });
});
