import assert from "node:assert/strict";
import test from "node:test";
import {
  JOB_COMPLETION_BONUS_DEFINITIONS,
  calculateJobCompletionBonuses,
  defaultCompletedJobIds,
} from "../web/job-completion-bonus-config.js";

const classVNames = new Set(["ヴァイキング", "パラディン", "パナケイア", "マナダイバー", "キング", "陰陽師", "スマヒヒト", "ブギーマン", "マリアッチ"]);
const catalog = JOB_COMPLETION_BONUS_DEFINITIONS.map((definition, index) => ({
  jobId: String(index + 1),
  name: definition.name,
  classTier: classVNames.has(definition.name) ? "ClassV" : "ClassIV",
}));

test("all 80 completed jobs reproduce the verified account-wide totals", () => {
  assert.equal(JOB_COMPLETION_BONUS_DEFINITIONS.length, 80);
  const ids = defaultCompletedJobIds(catalog);
  const result = calculateJobCompletionBonuses(ids, catalog, catalog.find((job) => job.name === "ナイト"));
  assert.equal(result.totals.attack, 24);
  assert.equal(result.totals.hp, 20);
  assert.equal(result.totals.da, 7);
  assert.equal(result.totals.ta, 5);
  assert.equal(result.totals.normalAttackDamage, 3);
});

test("King normal attack damage is inactive while a Class V job is selected", () => {
  const ids = defaultCompletedJobIds(catalog);
  const result = calculateJobCompletionBonuses(ids, catalog, catalog.find((job) => job.name === "キング"));
  assert.equal(result.totals.normalAttackDamage, undefined);
  assert.ok(result.inactiveConditionalEffects.some((entry) => entry.jobName === "キング"));
});

test("main-weapon completion bonuses combine only for the equipped weapon kind", () => {
  const ids = defaultCompletedJobIds(catalog);
  const selectedJob = catalog.find((job) => job.name === "ナイト");
  assert.equal(calculateJobCompletionBonuses(ids, catalog, selectedJob, "1").totals.mainWeaponAttack, 6);
  assert.equal(calculateJobCompletionBonuses(ids, catalog, selectedJob, "4").totals.mainWeaponAttack, 6);
  assert.equal(calculateJobCompletionBonuses(ids, catalog, selectedJob, "3").totals.mainWeaponAttack, 3);
  assert.equal(calculateJobCompletionBonuses(ids, catalog, selectedJob, "5").totals.mainWeaponAttack, 3);
  assert.equal(calculateJobCompletionBonuses(ids, catalog, selectedJob).totals.mainWeaponAttack, undefined);
});
