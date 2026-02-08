const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(`build/client${path}`);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Cache-Control": path.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        },
      });
    }
    return new Response(Bun.file("build/client/index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Server running at http://localhost:${port}`);
