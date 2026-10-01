import { readFile, writeFile } from "node:fs/promises";
import { parseRecordedBattleExports } from "../../mcp-server/dist/calculator/recordedBattleParser.js";
import { resolveCalculatorDeckConfig } from "../../mcp-server/dist/calculator/calculatorDeckResolver.js";
import { calculateNormalAttackFromRequest } from "../../mcp-server/dist/calculator/normalAttackCalculationRequest.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const deckCapture = argument("--deck-capture");
const battleCapture = argument("--battle-capture");
const output = argument("--output");
if (!battleCapture || !output) {
  console.error("usage: node scripts/data-collection/analyze-recorded-battle.mjs --battle-capture <export.json> [--deck-capture <export.json>] --output <local-report.json> [--defense <value>]");
  process.exit(1);
}
const inputs = await Promise.all([deckCapture, battleCapture].filter(Boolean).map(async (file) =>
  JSON.parse(await readFile(file, "utf8")),
));
const observation = parseRecordedBattleExports(inputs);
const defenseArgument = argument("--defense");
const defense = defenseArgument === undefined ? undefined : Number(defenseArgument);
if (defense !== undefined && (!Number.isFinite(defense) || defense <= 0)) throw new Error("--defense must be positive.");
const supportSummon = observation.battle.supportSummon?.masterId
  ? { summonId: observation.battle.supportSummon.masterId } : undefined;
const resolution = observation.deckConfig ? resolveCalculatorDeckConfig(observation.deckConfig) : undefined;
const skillCoverage = resolution?.deck.weapons.flatMap((weapon) => weapon.skills.map((skill) => ({
  weaponSlot: weapon.slot, weaponId: weapon.masterId, weaponName: weapon.name,
  skillId: skill.id, skillName: skill.name,
  numericEffectKinds: [...new Set((skill.effects ?? []).map((effect) => effect.kind))],
})));
let calculation;
let calculationError;
if (observation.deckConfig && defense !== undefined) {
  const enemy = observation.battle.enemies[0];
  if (!enemy?.elementCode) throw new Error("The recording has no enemy element.");
  try {
    calculation = calculateNormalAttackFromRequest({
      schemaVersion: 1, deckConfig: observation.deckConfig, supportSummon,
      enemy: { elementCode: enemy.elementCode, defense, attack: 0 },
    });
  } catch (error) {
    calculationError = error instanceof Error ? error.message : "Calculation failed.";
  }
}
const report = {
  ...observation,
  capability: {
    predictivePartySimulation: false,
    explanation: "実測トレースと既存の主人公通常攻撃モデルの照合用。実測値を予測値として扱わない。キャラクター固有効果・奥義・再行動等は別途実装が必要。",
    skillCoverage,
  },
  calculationAssumptions: {
    enemyDefense: defense, defenseSource: defense === undefined ? "未入力" : "CLI入力値（実機レスポンスからは取得できない）",
    note: "戦闘中のバフ、LB、船炉、サブキャラクター効果はこの照合計算に自動投入していない。",
  },
  calculation, calculationError,
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ...observation.summary, warningCount: observation.warnings.length,
  skillsWithoutNumericEffects: skillCoverage?.filter((skill) => skill.numericEffectKinds.length === 0).length,
  calculationStatus: calculation ? "provisional" : calculationError ? "error" : "not-requested",
}, null, 2));
if (calculationError) process.exitCode = 1;
