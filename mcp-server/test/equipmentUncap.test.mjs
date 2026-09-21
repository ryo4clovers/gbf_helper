import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEquipmentUncapStages,
  maximumLevelForUncap,
  maximumSkillLevelForUncap,
} from "../web/equipment-uncap.js";

const wikiUncaps = {
  minimum: 0,
  base: 3,
  maximum: 5,
  reduced: 0,
  verificationStatus: "下書き",
  source: "gbf.wiki Cargo",
};

test("combines standard SSR caps with collected 4-star and 5-star breakpoints", () => {
  const stages = createEquipmentUncapStages(wikiUncaps, "4", {
    points: [
      { level: 1 },
      { level: 100 },
      { level: 150 },
      { level: 200 },
    ],
  });
  assert.deepEqual(stages, [
    { uncapLevel: 0, maximumLevel: 40 },
    { uncapLevel: 1, maximumLevel: 60 },
    { uncapLevel: 2, maximumLevel: 80 },
    { uncapLevel: 3, maximumLevel: 100 },
    { uncapLevel: 4, maximumLevel: 150 },
    { uncapLevel: 5, maximumLevel: 200 },
  ]);
  assert.equal(maximumLevelForUncap(stages, 4), 150);
});

test("does not invent lower forms for a weapon whose Wiki minimum is 5 stars", () => {
  assert.deepEqual(createEquipmentUncapStages({ ...wikiUncaps, minimum: 5 }, "4", {
    points: [{ level: 1 }, { level: 100 }, { level: 200 }],
  }), [{ uncapLevel: 5, maximumLevel: 200 }]);
});

test("supports SR fourth uncaps from the collected level 120 breakpoint", () => {
  assert.deepEqual(createEquipmentUncapStages({ ...wikiUncaps, maximum: 4 }, "3", {
    points: [{ level: 1 }, { level: 60 }, { level: 120 }],
  }), [
    { uncapLevel: 0, maximumLevel: 30 },
    { uncapLevel: 1, maximumLevel: 40 },
    { uncapLevel: 2, maximumLevel: 50 },
    { uncapLevel: 3, maximumLevel: 60 },
    { uncapLevel: 4, maximumLevel: 120 },
  ]);
});

test("links uncap stages to the standard weapon-skill level caps", () => {
  assert.equal(maximumSkillLevelForUncap(0), 10);
  assert.equal(maximumSkillLevelForUncap(3), 10);
  assert.equal(maximumSkillLevelForUncap(4), 15);
  assert.equal(maximumSkillLevelForUncap(5), 20);
  assert.equal(maximumSkillLevelForUncap(6), 25);
});

test("preserves weapon-specific skill level caps", () => {
  assert.equal(maximumSkillLevelForUncap(5, 15), 15);
  assert.equal(maximumSkillLevelForUncap(6, 1), 1);
  assert.equal(maximumSkillLevelForUncap(3, 25), 10);
  assert.equal(maximumSkillLevelForUncap(undefined, 20), undefined);
});
