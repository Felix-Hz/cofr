import { join } from "node:path";

const clientPath = join(import.meta.dir, "build", "client");
const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Try to serve the exact file
    let filePath = join(clientPath, pathname);
    let file = Bun.file(filePath);

    if (await file.exists()) {
      const isAsset = pathname.startsWith("/assets/");
      return new Response(file, {
        headers: {
          "Cache-Control": isAsset
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        },
      });
    }

    // For SPA: serve index.html for all non-file routes
    const indexPath = join(clientPath, "index.html");
    const indexFile = Bun.file(indexPath);
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Server running at http://localhost:${port}`);
