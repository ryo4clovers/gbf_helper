import { z } from "zod";
import { normalAttackCalculationRequestSchema, resolveDamageCalculationRequest } from "./normalAttackCalculationRequest.js";
import { prepareNormalAttackActor, selectedCharacter, resolveCharacterArtifact, resolveNormalAttackSupport } from "./characterNormalAttack.js";
import { resolveCharacterMastery } from "./characterMastery.js";
import { calculateBattleNormalAttackPower } from "./normalAttackPowerCalculator.js";
import { calculateHpDependentAttack } from "./hpDependentAttackCalculator.js";
import { calculateArticleBaseDamage } from "./articleBaseDamageCalculator.js";
import { calculateOtherWeaponSkills } from "./otherWeaponSkillCalculator.js";
import { calculateNormalAttackSkillFrames } from "./normalAttackSkillFrames.js";
import { resolveBattleDamageEffects } from "./battleDamageEffects.js";
import { resolveSummonDamageEffects } from "./summonDamageEffects.js";
import { calculateDamageAttenuation, type DamageAttenuationProfile } from "./damageAttenuationCalculator.js";
import { elementalSuperiorityPercent } from "./baseDamageCalculator.js";

export const automaticAbilityIdSchema = z.enum(["mythical-arms", "mission-chocolate", "scythe-of-execution", "other-self"]);
export type AutomaticAbilityId = z.infer<typeof automaticAbilityIdSchema>;

function attenuation(id: string, thresholds: number[], rates: number[]): DamageAttenuationProfile {
  return { id, name: `${id}（同概算上限のアビリティからの候補）`, lines: thresholds.map((threshold, i) => ({ threshold, passRate: rates[i] })) };
}

/** Approximate caps do not identify attenuation lines. These are explicit candidates, never verified profiles. */
export const AUTOMATIC_ABILITY_PROFILES = {
  "mythical-arms": { name: "ミソロジックアームズ", multiplier: 1, element: "character", characterId: undefined,
    attenuation: attenuation("mythical-arms", [100000, 133333, 166666, 333333], [.5, .3, .05, .01]),
    source: "https://gbf.wiki/Lancer_Origin", multiplierStatus: "1倍を仮置き・独立検証が必要" },
  "mission-chocolate": { name: "菓製猛虎", multiplier: 4, element: "character", characterId: "3040512000",
    attenuation: attenuation("mission-chocolate", [500000, 600000, 700000, 800000], [.5, .25, .05, .01]),
    source: "https://gbf.wiki/Cidala_(Valentine)", multiplierStatus: "二次情報" },
  "scythe-of-execution": { name: "エクスキューショナーズ・サイス＋", multiplier: 8, element: "character", characterId: "3040611000",
    attenuation: attenuation("scythe-of-execution", [600000, 700000, 800000, 1000000], [.7, .5, .05, .01]),
    source: "https://gbf.wiki/Sariel", multiplierStatus: "二次情報" },
  "other-self": { name: "他化自在", multiplier: 3, element: "destruction", characterId: undefined,
    attenuation: attenuation("other-self", [300000, 400000, 500000, 1000000], [.7, .5, .05, .01]),
    source: "https://gbf.wiki/Versusia", multiplierStatus: "二次情報" },
} as const;

export const automaticAbilityCalculationRequestSchema = z.object({
  abilityId: automaticAbilityIdSchema,
  calculation: normalAttackCalculationRequestSchema.omit({ random: true, calculationModel: true }),
  criticalDamageBonusPercent: z.number().finite().min(0).max(1000).default(0)
    .describe("この発動に適用するクリティカル倍率加算。未入力は不発条件。通常攻撃の確定クリティカルを流用しない"),
}).strict();

export function calculateAutomaticAbilityDamage(input: unknown) {
  const { abilityId, calculation, criticalDamageBonusPercent } = automaticAbilityCalculationRequestSchema.parse(input);
  const { calculationInput: original, resolution } = resolveDamageCalculationRequest(calculation);
  const profile = AUTOMATIC_ABILITY_PROFILES[abilityId];
  const character = selectedCharacter(original);
  if (profile.characterId !== character?.masterId) throw new Error("アビリティと攻撃者が一致しません");
  if (character && (character.level ?? 0) < 80) throw new Error("自動アビリティはキャラクターLv80以上に対応しています");
  if (!character && original.deck.protagonist.elementCode !== "6") throw new Error("自動アビリティ計算は闇属性の主人公に対応しています");
  if (!character && (original.deck.protagonist.job?.masterId !== "190501" || (original.deck.protagonist.job.level ?? 0) < 40)) {
    throw new Error("主人公の自動アビリティはランサー・オリジンLv40以上に対応しています");
  }
  if (abilityId === "other-self" && !original.deck.summons.some((summon) =>
    summon.masterId === "2040448000" && summon.position === "main" && summon.uncapLevel === 4)) {
    throw new Error("他化自在はメイン4凸ヴェルサシアに対応しています");
  }
  // Impalement reduces enemy defense for damage in general; only the other
  // Executioner effects are normal-attack-only.
  const actor = prepareNormalAttackActor(original);
  const support = resolveNormalAttackSupport(actor);
  const level = character ? 0 : support.mythicalLancerLevel;
  const hitCount = abilityId === "mythical-arms" ? level : abilityId === "scythe-of-execution" ? 1 : 2;
  if (hitCount < 1) throw new Error("神伝の槍手Lv1以上が必要です");
  const target = actor.battle.enemies[0];
  const base = calculateArticleBaseDamage(actor, calculateBattleNormalAttackPower(actor.deck, actor.battle),
    calculateHpDependentAttack(actor.deck, actor.protagonistCurrentHpPercent ?? 100), profile.element);
  const artifact = resolveCharacterArtifact(actor);
  const mastery = resolveCharacterMastery(character, actor.protagonistCurrentHpPercent ?? 100, target.maxHp);
  const weapons = calculateOtherWeaponSkills(actor.deck);
  const frames = calculateNormalAttackSkillFrames(actor.deck);
  const summons = resolveSummonDamageEffects(actor.deck, profile.element === "destruction" ? "5" : target.elementCode,
    target.maxHp, actor.protagonistCurrentHpPercent ?? 100);
  const effects = resolveBattleDamageEffects(actor.battleEffects, character ? 0 : support.supplementalDamage);
  const percentValue = (text: string) => {
    const match = /^\+(\d+(?:\.\d+)?)%$/.exec(text);
    if (!match) throw new Error("アーティファクトのアビリティ効果量を解釈できません");
    return Number(match[1]);
  };
  const artifactAbilityPercent = (character?.artifact?.skills ?? []).filter((skill) => skill.name === "アビリティダメージ")
    .reduce((sum, skill) => sum + percentValue(skill.effectValue), 0);
  const ringCapPercent = (character?.mastery?.ring ?? []).filter((bonus) => bonus.name === "アビリティダメージ上限")
    .reduce((sum, bonus) => {
      if (bonus.unit !== "percent") throw new Error("指輪のアビリティ上限はpercentで指定してください");
      return sum + bonus.value;
    }, 0);
  const bonuses = original.abilityDamage!;
  const damageContributions = { account: calculation.modifiers.abilityDamagePercent ?? 0,
    artifact: artifactAbilityPercent, jobLevel: character ? 0 : 40,
    limitBonus: bonuses.limitBonusPercent ?? 0,
    completion: character ? 0 : resolution.protagonistAbilityCompletion.damagePercent };
  const damageUpPercent = Object.values(damageContributions).reduce((sum, value) => sum + value, 0);
  const effectiveMultiplier = profile.multiplier + damageUpPercent / 100;
  const generalCap = base.deferredCapModifiers.filter((modifier) => modifier.stage === "damage-cap")
    .reduce((sum, modifier) => sum + modifier.amountPercent, 0);
  const weaponCap = (kind: string, cap = 20) => Math.min(cap, (actor.deck.effectiveWeaponSkillEffects ?? [])
    .filter((effect) => effect.kind === kind && (!effect.elementCode || effect.elementCode === actor.deck.protagonist.elementCode))
    .reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0));
  const actorCap = character ? (character.perpetuityRing ? 5 : 0)
    + (original.attacker?.artifactStartBuffs?.damageCapUp && character.artifact?.skills.some((skill) => skill.skillId === "50211") ? 10 : 0) : support.damageCapPercent;
  const capContributions = { generalCap, weaponGeneralCap: weaponCap("normal-frame-damage-cap-up"),
    weaponSpecialGeneralCap: weaponCap("special-frame-damage-cap-up"), weaponAbilityCap: weapons.abilityDamageCap.effectivePercent,
    weaponSpecialAbilityCap: weaponCap("special-ability-damage-cap-up", 30), actorCap, summonCap: summons.capPercent,
    ringCap: ringCapPercent, jobLevelCap: character ? 0 : 20, accountAbilityCap: calculation.modifiers.abilityDamageCapPercent ?? 0,
    limitBonusCap: bonuses.limitBonusDamageCapUpPercent ?? 0,
    completionCap: character ? 0 : resolution.protagonistAbilityCompletion.capPercent };
  const capPercent = Object.values(capContributions).reduce((sum, value) => sum + value, 0);
  const advantageous = profile.element === "destruction" || elementalSuperiorityPercent(actor.deck.protagonist.elementCode, target.elementCode) > 0;
  const amplificationPercent = (calculation.modifiers.damageDealtPercent ?? 0) + (advantageous ? calculation.modifiers.targetElementDamagePercent ?? 0 : 0)
    + weaponCap("special-ability-damage-dealt-up", 10) + weapons.damageDealt.effectivePercent + summons.amplificationPercent + artifact.fullHpAmplificationPercent
    + (advantageous ? frames.elementalSuperiority.effectivePercent : 0) + level * 2;
  const supplementalDamage = weapons.supplementalDamage.effectiveAmount + weapons.abilitySupplementalDamage.effectiveAmount
    + effects.supportSkillSupplementalDamage + effects.enemySupplementalDamage + summons.supplementalDamage + mastery.supplementalDamage;
  const nominal = base.articleTrace!.prePostCapDamage * effectiveMultiplier * (1 + criticalDamageBonusPercent / 100);
  const predictions = Array.from({ length: 101 }, (_, index) => {
    const randomMultiplier = (950 + index) / 1000;
    const attenuated = calculateDamageAttenuation(nominal * randomMultiplier, profile.attenuation, { damageCapUpPercent: capPercent }).damage;
    const damage = Math.ceil((attenuated * (1 + effects.enemyDamageTakenAmplificationPercent / 100) + supplementalDamage)
      * (1 + amplificationPercent / 100));
    return { randomMultiplier, damage };
  });
  const minimum = predictions[0].damage, maximum = predictions[100].damage;
  return {
    schemaVersion: 1 as const, verificationStatus: "下書き" as const, modelVersion: "automatic-ability-candidate-v2", abilityId, abilityName: profile.name, hitCount,
    element: profile.element, criticalDamageBonusPercent,
    perHit: { minimum, maximum, mean: predictions.reduce((sum, p) => sum + p.damage, 0) / predictions.length },
    total: { minimum: minimum * hitCount, maximum: maximum * hitCount },
    predictions,
    trace: { commonPreAbilityDamage: base.articleTrace!.prePostCapDamage, intrinsicMultiplier: profile.multiplier,
      damageUpPercent, damageContributions, effectiveMultiplier, capPercent, capContributions, amplificationPercent, supplementalDamage,
      enemyDamageTakenAmplificationPercent: effects.enemyDamageTakenAmplificationPercent,
      attenuation: profile.attenuation, ringCapPercent, artifactAbilityPercent, level },
    deckResolutionIssues: resolution.issues,
    issues: ["減衰ラインは同概算上限の別アビリティからの候補で、対象ごとの実機検証が必要",
      "既存の序盤ログとは未一致。倍率・減衰・補正範囲・丸めを含む候補値であり、実測再現値ではない",
      "減衰→被ダメージUP→固定加算→与ダメージ増幅→切り上げの順は下書き。通常専用補正は適用しない",
      "クリティカルは入力条件。発動確率・通常攻撃の確定クリティカルからは自動決定しない",
      "主人公のジョブLv補正40%/20%・LB・選択済みジョブのコンプリート補正は主人公だけに自動加算（二次情報）",
      ...(!character && !resolution.protagonistAbilityCompletion.specified
        ? ["completedJobIds未入力のためアビリティのコンプリート補正は未反映（全取得を仮定しない）"] : []),
      ...(abilityId === "mythical-arms" ? [profile.multiplierStatus] : []),
      ...(weapons.supplementalDamage.effectiveAmount > 0 ? ["武器の敵最大HP依存与ダメージは加算上限値で計算（低HP敵は未検証）"] : []),
      ...(summons.enemyHpCapUnresolved || mastery.enemyHpCapUnresolved ? ["敵最大HP未入力のためHP依存の固定与ダメージは上限値で計算"] : []),
      ...artifact.unsupportedSkills.map((id) => `未接続アーティファクト: ${id}`),
      ...mastery.unsupportedBonuses.map((id) => `未接続強化: ${id}`)],
    sources: [profile.source, "https://kikumarogaming.com/granbluefantasy-damegecaplist/", "https://gbf.wiki/Damage_Formula/Detailed_Damage_Formula"],
  };
}
