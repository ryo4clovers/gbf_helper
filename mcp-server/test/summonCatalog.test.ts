import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadIncrementalSummonCatalog,
  resolveBattleSupportSummon,
} from "../src/calculator/summonCatalog.ts";
import type { BattleSnapshot } from "../src/calculator/types.ts";

test("loads the initial non-damage summon aura", () => {
  const catalog = loadIncrementalSummonCatalog();
  const summon = catalog.summons.get("2030051000");

  assert.equal(catalog.summons.size, 2);
  assert.equal(summon?.name, "シルフィードベル");
  assert.equal(summon?.verificationStatus, "検証済み");
  assert.deepEqual(summon?.auraEffects, [
    {
      kind: "utility",
      description: "レアモンスターの出現確率UP。攻撃力計算には影響しない",
    },
  ]);
});

test("resolves the sanitized Hades support summon from battle state", () => {
  const battle = {
    schemaVersion: 1,
    enemies: [],
    enemyPassiveEffectCount: 0,
    fieldEffectCount: 0,
    supportSummon: { masterId: "2040090000", name: "ハデス", elementCode: "6" },
  } satisfies BattleSnapshot;

  const support = resolveBattleSupportSummon(battle);
  assert.equal(support?.name, "ハデス");
  assert.deepEqual(
    support?.aura.effects.map((effect) => [
      effect.kind,
      "amountPercent" in effect ? effect.amountPercent : undefined,
    ]),
    [
      ["normal-skill-boost", 170],
      ["elemental-attack-up", 30],
    ],
  );
});
