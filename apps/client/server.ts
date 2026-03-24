const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(`build/client${path}`);
    if (await file.exists()) {
      let cacheControl = "public, max-age=3600";
      if (path.startsWith("/assets/")) {
        cacheControl = "public, max-age=31536000, immutable";
      } else if (
        path === "/sw.js" ||
        path === "/manifest.webmanifest" ||
        path === "/robots.txt" ||
        path === "/sitemap.xml"
      ) {
        cacheControl = "no-cache";
      }
      return new Response(file, {
        headers: { "Cache-Control": cacheControl },
      });
    }
    return new Response(Bun.file("build/client/index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Server running at http://localhost:${port}`);
