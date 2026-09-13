import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveEffectiveCharacterHpAuras,
  resolveEffectiveCharacterHpFlatAuras,
} from "../src/calculator/summonAuraEffectResolver.ts";
import type { DeckSummon } from "../src/calculator/types.ts";

function hpSummon(
  slot: number,
  masterId: string,
  name: string,
  amountPercent: number,
): DeckSummon {
  return {
    slot,
    position: "sub",
    masterId,
    name,
    aura: {
      name: `${name}の加護`,
      description: "テスト",
      effects: [{
        kind: "character-hp-up",
        elementCode: "1",
        amountPercent,
        activation: "sub-only",
        stackingGroup: "fire-character-hp",
        description: `火属性キャラのHPが${amountPercent}%UP`,
      }],
      verificationStatus: "検証済み",
      source: "実機編成比較",
      confirmedAt: "2026-09-10",
    },
  };
}

test("reproduces each observed fire character HP sub aura", () => {
  const agni = resolveEffectiveCharacterHpAuras([hpSummon(1, "agni", "アグニス", 20)], "1");
  const devil = resolveEffectiveCharacterHpAuras([hpSummon(1, "devil", "ザ・デビル", 30)], "1");
  const sekitoba = resolveEffectiveCharacterHpAuras([hpSummon(1, "sekitoba", "セキトバ", 30)], "1");

  assert.deepEqual(agni.map((effect) => effect.amountPercent), [20]);
  assert.deepEqual(devil.map((effect) => effect.amountPercent), [30]);
  assert.deepEqual(sekitoba.map((effect) => effect.amountPercent), [30]);
});

test("same-group HP sub auras keep only the strongest source", () => {
  const agniAndDevil = resolveEffectiveCharacterHpAuras([
    hpSummon(1, "agni", "アグニス", 20),
    hpSummon(2, "devil", "ザ・デビル", 30),
  ], "1");
  const devilAndSekitoba = resolveEffectiveCharacterHpAuras([
    hpSummon(1, "devil", "ザ・デビル", 30),
    hpSummon(2, "sekitoba", "セキトバ", 30),
  ], "1");

  assert.deepEqual(agniAndDevil.map((effect) => effect.sourceSummonId), ["devil"]);
  assert.deepEqual(devilAndSekitoba.map((effect) => effect.sourceSummonId), ["devil"]);
  assert.deepEqual(agniAndDevil.map((effect) => effect.amountPercent), [30]);
  assert.deepEqual(devilAndSekitoba.map((effect) => effect.amountPercent), [30]);
});

test("HP sub auras do not apply to another element or a main slot", () => {
  const sub = hpSummon(1, "devil", "ザ・デビル", 30);
  const main = { ...sub, position: "main" as const };

  assert.deepEqual(resolveEffectiveCharacterHpAuras([sub], "2"), []);
  assert.deepEqual(resolveEffectiveCharacterHpAuras([main], "1"), []);
});

test("resolves an all-element flat HP aura only from the main summon", () => {
  const summon: DeckSummon = {
    slot: 1,
    position: "main",
    masterId: "2040430000",
    name: "蒼空の楔",
    aura: {
      name: "六竜の加護",
      description: "全属性キャラのHPを25000上昇",
      effects: [{
        kind: "character-hp-flat",
        elementCode: "0",
        amount: 25000,
        activation: "main-only",
        description: "全属性キャラのHPを25000上昇",
      }],
      verificationStatus: "検証済み",
      source: "実機編成比較",
    },
  };

  assert.deepEqual(
    resolveEffectiveCharacterHpFlatAuras([summon], "1").map((effect) => effect.amount),
    [25000],
  );
  assert.deepEqual(resolveEffectiveCharacterHpFlatAuras([{ ...summon, position: "sub" }], "1"), []);
});
