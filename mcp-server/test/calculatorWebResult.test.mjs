import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local result area exposes HP, critical rate, and DA/TA rate metrics", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
  ]);

  for (const id of ["protagonist-hp", "critical-rate", "da-rate", "ta-rate"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`\\$\\(["']${id}["']\\)`));
  }
  assert.match(html, /<p>連撃率<\/p>/u);
});
