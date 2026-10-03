import { readFile, writeFile } from "node:fs/promises";
import { parseRecordedBattleExports } from "../../mcp-server/dist/calculator/recordedBattleParser.js";
import { resolveCalculatorDeckConfig } from "../../mcp-server/dist/calculator/calculatorDeckResolver.js";
import { calculateNormalAttackFromRequest } from "../../mcp-server/dist/calculator/normalAttackCalculationRequest.js";
import { parseAccountBonusResponse } from "../../mcp-server/dist/calculator/accountBonusParser.js";
import { compareRecordedNormalAttacks, compareRecordedNormalAttackStates } from "../../mcp-server/dist/calculator/recordedNormalAttackComparison.js";
import { reconstructRecordedNormalAttackStates } from "../../mcp-server/dist/calculator/recordedNormalAttackState.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const deckCapture = argument("--deck-capture");
const battleCapture = argument("--battle-capture");
const output = argument("--output");
const accountBonusFile = argument("--account-bonuses");
const useRecordedState = process.argv.includes("--recorded-state");
const compareTurnArgument = argument("--compare-turn");
const compareTurn = compareTurnArgument === undefined ? undefined : Number(compareTurnArgument);
if (compareTurn !== undefined && (!Number.isInteger(compareTurn) || compareTurn < 1)) throw new Error("--compare-turn must be a positive integer.");
const mythicalLancerLevelArgument = argument("--mythical-lancer-level");
const mythicalLancerLevel = mythicalLancerLevelArgument === undefined ? undefined : Number(mythicalLancerLevelArgument);
if (mythicalLancerLevel !== undefined && (!Number.isInteger(mythicalLancerLevel) || mythicalLancerLevel < 0 || mythicalLancerLevel > 5)) throw new Error("--mythical-lancer-level must be in 0..5.");
const crew = { shipAttackPercent: Number(argument("--ship") ?? 0), furnaceAttackPercent: Number(argument("--furnace") ?? 0) };
if (Object.values(crew).some((value) => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error("--ship and --furnace must be in 0..100.");
if (!battleCapture || !output) {
  console.error("usage: node scripts/data-collection/analyze-recorded-battle.mjs --battle-capture <export.json> [--deck-capture <export.json>] --output <local-report.json> [--defense <value>] [--ship <percent>] [--furnace <percent>] [--account-bonuses <local.json>] [--mythical-lancer-level <0..5>] [--compare-turn <turn>] [--recorded-state]");
  process.exit(1);
}
const inputs = await Promise.all([deckCapture, battleCapture].filter(Boolean).map(async (file) =>
  JSON.parse(await readFile(file, "utf8")),
));
const observation = parseRecordedBattleExports(inputs);
const accountBonuses = accountBonusFile ? parseAccountBonusResponse(JSON.parse(await readFile(accountBonusFile, "utf8"))) : undefined;
const ownElement = observation.deckConfig?.protagonist.elementCode;
const targetElement = observation.battle.enemies[0]?.elementCode;
const applicableBonuses = (accountBonuses?.modifiers ?? []).filter((modifier) =>
  (modifier.elementCode === undefined || modifier.elementCode === ownElement)
  && (modifier.targetElementCode === undefined || modifier.targetElementCode === targetElement));
const bonus = (stage, allElements = false) => applicableBonuses.filter((modifier) => modifier.stage === stage
  && (stage !== "elemental-attack" || (allElements ? modifier.elementCode === undefined : modifier.elementCode !== undefined)))
  .reduce((sum, modifier) => sum + modifier.amountPercent, 0);
const accountModifiers = {
  allElementAttackPercent: bonus("elemental-attack", true), elementAttackPercent: bonus("elemental-attack"),
  damageDealtPercent: bonus("damage-dealt"), targetElementDamagePercent: bonus("target-element-damage"),
  damageCapPercent: bonus("damage-cap"), normalAttackDamageCapPercent: bonus("normal-attack-damage-cap"),
};
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
let calculationRequest;
if (observation.deckConfig && defense !== undefined) {
  const enemy = observation.battle.enemies[0];
  if (!enemy?.elementCode) throw new Error("The recording has no enemy element.");
  try {
    calculationRequest = {
      schemaVersion: 1, deckConfig: observation.deckConfig, supportSummon,
      mythicalLancerLevel,
      enemy: { elementCode: enemy.elementCode, defense, attack: 0, maxHp: enemy.maxHp },
      modifiers: { ...crew, ...accountModifiers },
    };
    calculation = calculateNormalAttackFromRequest(calculationRequest);
  } catch (error) {
    calculationError = error instanceof Error ? error.message : "Calculation failed.";
  }
}
if (compareTurn !== undefined && !observation.turns.some((turn) => turn.turn === compareTurn)) throw new Error("--compare-turn is absent from the recording.");
const recordedStates = calculation && useRecordedState ? reconstructRecordedNormalAttackStates(observation,
  calculation.result.protagonistNormalAttackSupport.initialMythicalLancerLevel).filter((state) => compareTurn === undefined || state.turn === compareTurn) : undefined;
const normalAttackComparison = recordedStates ? compareRecordedNormalAttackStates(calculationRequest, observation, recordedStates)
  : calculation && ownElement ? compareRecordedNormalAttacks(calculation.result,
  observation.turns.filter((turn) => compareTurn === undefined || turn.turn === compareTurn).flatMap((turn) => turn.packets), ownElement) : undefined;
const report = {
  ...observation,
  capability: {
    predictivePartySimulation: false,
    explanation: "実測トレースと既存の主人公通常攻撃モデルの照合用。実測値を予測値として扱わない。キャラクター固有効果・奥義・再行動等は別途実装が必要。",
    skillCoverage,
  },
  calculationAssumptions: {
    enemyDefense: defense, defenseSource: defense === undefined ? "未入力" : "CLI入力値（実機レスポンスからは取得できない）",
    crewModifiers: crew,
    mythicalLancerLevel, mythicalLancerLevelSource: mythicalLancerLevel !== undefined ? "CLIで指定した戦闘状態"
      : useRecordedState ? "各攻撃前の記録状態（欠落時は暫定hitカウンタ）" : "開始時の装備から算出",
    limitBonusesImported: observation.protagonistLimitBonusesImported,
    accountBonusesImported: accountBonuses !== undefined,
    accountModifiers,
    compareTurn,
    useRecordedState,
    note: useRecordedState ? "記録された攻撃前の槍手Lv・HP、既知アビリティによる敵弱体を適用する条件付き照合。"
      : "記録されたLBと入力された船炉を使用。戦闘中のバフ・デバフは自動投入していない。",
  },
  calculation, calculationError, normalAttackComparison,
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ...observation.summary, warningCount: observation.warnings.length,
  skillsWithoutNumericEffects: skillCoverage?.filter((skill) => skill.numericEffectKinds.length === 0).length,
  calculationStatus: calculation ? "provisional" : calculationError ? "error" : "not-requested",
  comparedComponents: normalAttackComparison?.components,
}, null, 2));
if (calculationError) process.exitCode = 1;
