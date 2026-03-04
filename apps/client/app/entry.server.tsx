// Bun-compatible entry.server using Web Streams API
// https://github.com/remix-run/react-router/issues/12568

import { renderToReadableStream } from "react-dom/server";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
  );

  responseHeaders.set("Content-Type", "text/html");
  return new Response(stream, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
