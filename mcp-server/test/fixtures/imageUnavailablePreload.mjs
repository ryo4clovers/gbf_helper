import { ServerResponse } from "node:http";

// Test-only: never contact an external server, including during manual browser checks.
const mode = process.env.GBF_TEST_IMAGE_MODE ?? "offline";
globalThis.fetch = async () => {
  // Hold until test-process cleanup, independent of machine load and real timeout clocks.
  if (mode === "pending") return new Promise(() => {});
  if (mode === "failed") return new Response("Unavailable", { status: 503 });
  throw new TypeError("Simulated external network unavailable");
};

if (mode === "no-images") {
  const originalEnd = ServerResponse.prototype.end;
  ServerResponse.prototype.end = function (body, ...args) {
    if (this.req.url?.startsWith("/api/catalog/") && this.statusCode === 200 && typeof body === "string") {
      const catalog = JSON.parse(body);
      for (const entries of Object.values(catalog)) {
        if (Array.isArray(entries)) for (const entry of entries) delete entry.imageUrl;
      }
      body = JSON.stringify(catalog);
    }
    return originalEnd.call(this, body, ...args);
  };
}
