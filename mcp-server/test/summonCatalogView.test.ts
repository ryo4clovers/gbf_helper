import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableSummonCatalog } from "../src/calculator/summonCatalogView.ts";

test("creates a deterministic browser-safe summon catalog", () => {
  const catalog = createSelectableSummonCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(
    catalog.summons.map((summon) => summon.name),
    ["アグニス", "シルフィードベル", "ハデス"],
  );
  const hades = catalog.summons.find((summon) => summon.summonId === "2040090000");
  assert.equal(hades?.auraEffects.length, 2);
  assert.equal(hades?.auraEffects[0]?.kind, "normal-skill-boost");
  assert.equal(JSON.stringify(catalog).includes("instanceId"), false);
});
