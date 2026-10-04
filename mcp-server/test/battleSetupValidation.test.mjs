import { test } from "node:test";
import assert from "node:assert/strict";
import { battleSetupStatIssues } from "../web/battle-state.js";

test("battle entry explains missing front-row displayed stats without mutating the deck", () => {
  const deck = { characters: [
    { slot: 1, position: "front", characterId: "dark-ssr-ilsa-yukata", nameHint: "イルザ" },
    { slot: 2, position: "front", characterId: "3040611000", hpOverride: 10000, attackOverride: 40000 },
    { slot: 4, position: "back", characterId: "back-row" },
  ] };
  const before = structuredClone(deck);
  assert.equal(battleSetupStatIssues(deck).length, 1);
  assert.match(battleSetupStatIssues(deck)[0], /前衛1（イルザ）の表示HP・表示ATKが未入力.*編成画面/);
  assert.deepEqual(deck, before);
  deck.characters[0].hpOverride = 10000;
  assert.match(battleSetupStatIssues(deck)[0], /表示ATKが未入力/);
  deck.characters[0].attackOverride = 40000;
  assert.deepEqual(battleSetupStatIssues(deck), []);
  deck.characters[0].hpOverride = 0;
  assert.match(battleSetupStatIssues(deck)[0], /表示HPが未入力/);
  assert.deepEqual(battleSetupStatIssues({}), []);
});
