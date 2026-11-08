import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const render = async (landing: boolean) => {
  vi.doMock("~/lib/constants", () => ({ IS_LANDING: landing }));
  const { default: LandingAnalytics } = await import("./LandingAnalytics");
  return renderToStaticMarkup(React.createElement(LandingAnalytics));
};

describe("LandingAnalytics", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("~/lib/constants");
  });

  it("renders the beacon tag in the landing build", async () => {
    expect(await render(true)).toBe('<script defer="" src="https://e.felix-hzv.dev/b.js"></script>');
  });

  it("renders nothing in the self-hosted app", async () => {
    expect(await render(false)).toBe("");
  });
});
