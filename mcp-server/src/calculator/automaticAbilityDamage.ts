import { calculateWeaponOverskills, applyDamageCapPenetration } from "./weaponOverskills.js";
import { calculateWeaponSkillCriticalProfile } from "./criticalBodyDamageCalculator.js";
import { z } from "zod";
import { normalAttackCalculationRequestSchema, resolveDamageCalculationRequest, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
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
import { characterAwakeningBonuses } from "./characterDisplayedStats.js";

export const automaticAbilityIdSchema = z.enum(["mythical-arms", "mission-chocolate", "scythe-of-execution", "other-self"]);
export type AutomaticAbilityId = z.infer<typeof automaticAbilityIdSchema>;

function attenuation(id: string, thresholds: number[], rates: number[], tableId?: string): DamageAttenuationProfile {
  return { id, name: tableId ? `${id}（実機減衰設定 ${tableId}）` : `${id}（同概算上限のアビリティからの候補）`,
    lines: thresholds.map((threshold, i) => ({ threshold, passRate: rates[i] })) };
}

/** Captured table settings verify only attenuation parameters, not multipliers, modifiers or rounding. */
export const AUTOMATIC_ABILITY_PROFILES = {
  "mythical-arms": { name: "ミソロジックアームズ", multiplier: 1, element: "character", characterId: undefined,
    attenuationTableId: undefined, actionId: undefined,
    attenuation: attenuation("mythical-arms", [100000, 133333, 166666, 333333], [.5, .3, .05, .01]),
    source: "https://gbf.wiki/Lancer_Origin", multiplierStatus: "1倍を仮置き・独立検証が必要" },
  "mission-chocolate": { name: "菓製猛虎", multiplier: 4, element: "character", characterId: "3040512000",
    attenuationTableId: "5000001", actionId: "239421",
    attenuation: attenuation("mission-chocolate", [500000, 600000, 700000, 800000], [.5, .25, .05, .01], "5000001"),
    source: "https://gbf.wiki/Cidala_(Valentine)", multiplierStatus: "二次情報" },
  "scythe-of-execution": { name: "エクスキューショナーズ・サイス＋", multiplier: 8, element: "character", characterId: "3040611000",
    attenuationTableId: "6000001", actionId: "245941",
    attenuation: attenuation("scythe-of-execution", [600000, 700000, 800000, 1000000], [.7, .5, .05, .01], "6000001"),
    source: "https://gbf.wiki/Sariel", multiplierStatus: "二次情報" },
  "other-self": { name: "他化自在", multiplier: 3, element: "destruction", characterId: undefined,
    attenuationTableId: undefined, actionId: undefined,
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
  return calculateProfileDamage(calculation, abilityId, AUTOMATIC_ABILITY_PROFILES[abilityId], criticalDamageBonusPercent);
}

export interface SkillDamageProfile {
  name: string; multiplier: number; element: "character" | "destruction"; characterId: string | undefined;
  attenuationTableId?: string; actionId?: string; attenuation: DamageAttenuationProfile;
  source: string; multiplierStatus: string;
  fixedChargeDamage?: number;
}

/** Shared outgoing skill stages; charge attacks deliberately exclude ability-only bonuses. */
export function calculateProfileDamage(input: NormalAttackCalculationRequest, abilityId: string,
  profile: SkillDamageProfile, criticalDamageBonusPercent = 0, kind: "ability" | "charge" = "ability", fixedHitCount?: number) {
  const calculation = normalAttackCalculationRequestSchema.parse(input);
  const { calculationInput: original, resolution } = resolveDamageCalculationRequest(calculation);
  const charge = kind === "charge";
  const character = selectedCharacter(original);
  if (profile.characterId !== character?.masterId) throw new Error("アビリティと攻撃者が一致しません");
  if (character && (character.level ?? 0) < 80) throw new Error("自動アビリティはキャラクターLv80以上に対応しています");
  if (!character && original.deck.protagonist.elementCode !== "6") throw new Error("自動アビリティ計算は闇属性の主人公に対応しています");
  if (!charge && !character && (original.deck.protagonist.job?.masterId !== "190501" || (original.deck.protagonist.job.level ?? 0) < 40)) {
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
  const hitCount = fixedHitCount ?? (abilityId === "mythical-arms" ? level : abilityId === "scythe-of-execution" ? 1 : 2);
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
  const artifactAbilityPercent = (character?.artifact?.skills ?? []).filter((skill) => skill.name === (charge ? "奥義ダメージ" : "アビリティダメージ"))
    .reduce((sum, skill) => sum + percentValue(skill.effectValue), 0);
  const ringCapPercent = (character?.mastery?.ring ?? []).filter((bonus) => bonus.name === (charge ? "奥義ダメージ上限" : "アビリティダメージ上限"))
    .reduce((sum, bonus) => {
      if (bonus.unit !== "percent") throw new Error("指輪のアビリティ上限はpercentで指定してください");
      return sum + bonus.value;
    }, 0);
  const bonuses = original.abilityDamage!;
  const awakening = characterAwakeningBonuses(character?.awakening?.level, character?.awakening?.formCode);
  const caLevels = (calculation.deckConfig.protagonist as { otherLimitBonusLevels?: Record<string, number> })?.otherLimitBonusLevels ?? {};
  const caLb = ["21", "35", "41", "91"].reduce((sum, id) => sum + (id === "91" ? [0, 2, 4, 8] : [0, 1, 3, 5])[caLevels[id] ?? 0], 0);
  const damageContributions = { account: (charge ? calculation.modifiers.chargeDamagePercent : calculation.modifiers.abilityDamagePercent) ?? 0,
    weapon: charge ? weapons.chargeDamage.effectivePercent : weapons.abilityDamage.effectivePercent,
    artifact: artifactAbilityPercent, jobLevel: character || charge ? 0 : 40,
    limitBonus: charge ? (character ? 0 : caLb) : bonuses.limitBonusPercent ?? 0,
    completion: character || charge ? 0 : resolution.protagonistAbilityCompletion.damagePercent,
    ...(charge ? { awakening: awakening.chargeDamagePercent, ringChargeDamage: (character?.mastery?.ring ?? []).filter((bonus) => bonus.name === "奥義ダメージ")
      .reduce((sum, bonus) => { if (bonus.unit !== "percent") throw new Error("指輪奥義ダメージはpercentで指定してください"); return sum + bonus.value; }, 0) } : {}) };
  const damageUpPercent = Object.values(damageContributions).reduce((sum, value) => sum + value, 0);
  const effectiveMultiplier = charge ? profile.multiplier * (1 + damageUpPercent / 100) : profile.multiplier + damageUpPercent / 100;
  const generalCap = base.deferredCapModifiers.filter((modifier) => modifier.stage === "damage-cap")
    .reduce((sum, modifier) => sum + modifier.amountPercent, 0);
  const weaponCap = (kind: string, cap = 20) => Math.min(cap, (actor.deck.effectiveWeaponSkillEffects ?? [])
    .filter((effect) => effect.kind === kind && (!effect.elementCode || effect.elementCode === actor.deck.protagonist.elementCode))
    .reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0));
  const actorCap = character ? (character.perpetuityRing ? 5 : 0)
    + (original.attacker?.artifactStartBuffs?.damageCapUp && character.artifact?.skills.some((skill) => skill.skillId === "50211") ? 10 : 0) : support.damageCapPercent - (original.battleEffects?.damageCapPercent ?? 0);
  const capContributions = { generalCap, battleBuffCap: original.battleEffects?.damageCapPercent ?? 0, weaponGeneralCap: weaponCap("normal-frame-damage-cap-up"),
    awakeningChargeCap: charge ? awakening.chargeCapPercent : 0,
    weaponChargeCap: charge ? weapons.chargeDamageCap.effectivePercent : 0,
    weaponSpecialGeneralCap: weaponCap("special-frame-damage-cap-up"), weaponAbilityCap: charge ? 0 : weapons.abilityDamageCap.effectivePercent,
    weaponSpecialAbilityCap: charge ? 0 : weaponCap("special-ability-damage-cap-up", 30), actorCap, summonCap: summons.capPercent,
    ringCap: ringCapPercent, jobLevelCap: character || charge ? 0 : 20, accountAbilityCap: (charge ? calculation.modifiers.chargeDamageCapPercent : calculation.modifiers.abilityDamageCapPercent) ?? 0,
    limitBonusCap: charge ? 0 : bonuses.limitBonusDamageCapUpPercent ?? 0,
    completionCap: character || charge ? 0 : resolution.protagonistAbilityCompletion.capPercent };
  const capPercent = Object.values(capContributions).reduce((sum, value) => sum + value, 0);
  const advantageous = profile.element === "destruction" || elementalSuperiorityPercent(actor.deck.protagonist.elementCode, target.elementCode) > 0;
  const amplificationPercent = (calculation.modifiers.damageDealtPercent ?? 0) + (advantageous ? calculation.modifiers.targetElementDamagePercent ?? 0 : 0)
    + (charge ? 0 : weaponCap("special-ability-damage-dealt-up", 10)) + weapons.damageDealt.effectivePercent + summons.amplificationPercent + artifact.fullHpAmplificationPercent
    + (advantageous ? frames.elementalSuperiority.effectivePercent : 0) + level * 2;
  const supplementalDamage = weapons.supplementalDamage.effectiveAmount + (charge ? weapons.chargeSupplementalDamage.effectiveAmount : weapons.abilitySupplementalDamage.effectiveAmount)
    + effects.supportSkillSupplementalDamage + effects.enemySupplementalDamage + summons.supplementalDamage + mastery.supplementalDamage;
  criticalDamageBonusPercent += advantageous ? original.battleEffects?.criticalDamageBonusPercent ?? 0 : 0;
  const weaponCritical = calculateWeaponSkillCriticalProfile(weaponCap("critical-rate-up", Infinity));
  // Only guaranteed weapon criticals can be selected without a separate random branch.
  if (advantageous && weaponCritical.effectiveRatePercent === 100) criticalDamageBonusPercent += weaponCritical.criticalDamageBonusPercent;
  const weaponOverskills = calculateWeaponOverskills(actor.deck);
  const attenuationProfile = applyDamageCapPenetration(profile.attenuation, weaponOverskills.damageCapPenetrationPercent);
  const fixedChargeDamage = charge ? profile.fixedChargeDamage ?? 0 : 0;
  const predictions = Array.from({ length: 101 }, (_, index) => {
    const randomMultiplier = (950 + index) / 1000;
    const rawDamage = (base.articleTrace!.prePostCapDamage * effectiveMultiplier * randomMultiplier + fixedChargeDamage)
      * (1 + criticalDamageBonusPercent / 100);
    // Match normal attacks: round the cap increase, preserving scaleDamageCapThreshold's
    // floating-point evaluation order. Supported by the 2026-10-05 ability/CA comparison.
    const attenuated = calculateDamageAttenuation(rawDamage, attenuationProfile, {
      damageCapUpPercent: capPercent, thresholdRounding: "ceil-increase",
    }).damage;
    const damage = Math.ceil((attenuated * (1 + effects.enemyDamageTakenAmplificationPercent / 100) + supplementalDamage)
      * (1 + amplificationPercent / 100));
    return { randomMultiplier, damage };
  });
  const minimum = predictions[0].damage, maximum = predictions[100].damage;
  return {
    schemaVersion: 1 as const, verificationStatus: "下書き" as const, modelVersion: "automatic-ability-candidate-v3", abilityId, abilityName: profile.name, hitCount,
    element: profile.element, criticalDamageBonusPercent,
    perHit: { minimum, maximum, mean: predictions.reduce((sum, p) => sum + p.damage, 0) / predictions.length },
    total: { minimum: minimum * hitCount, maximum: maximum * hitCount },
    predictions,
    trace: { commonPreAbilityDamage: base.articleTrace!.prePostCapDamage, intrinsicMultiplier: profile.multiplier,
      damageUpPercent, damageContributions, effectiveMultiplier, fixedChargeDamage, capPercent, capContributions, amplificationPercent, supplementalDamage,
      enemyDamageTakenAmplificationPercent: effects.enemyDamageTakenAmplificationPercent, thresholdRounding: "ceil-increase" as const,
      attenuation: attenuationProfile, weaponOverskills, weaponCritical, ringCapPercent, artifactAbilityPercent, level },
    attenuationEvidence: profile.attenuationTableId ? {
      status: "実機設定確認" as const, tableId: profile.attenuationTableId, actionId: profile.actionId,
      confirmedAt: "2026-10-04", source: "ユーザー提供キャラ詳細のdamage_limit_type・damage_limit1〜4・damage_deduction1〜4を照合",
    } : { status: "候補" as const, source: "同概算上限の別アビリティからの候補。対象自身の実機減衰設定は未確認" },
    deckResolutionIssues: resolution.issues,
    issues: [profile.attenuationTableId
      ? "減衰ID・4ライン・通過率はキャラ詳細の実機設定を確認済み。倍率・編成補正・境界実測・丸めは未検証"
      : "減衰ラインは同概算上限の別アビリティからの候補で、対象ごとの実機検証が必要",
      "上限増加分の切り上げはイルザ2アビ・奥義と主人公奥義の照合で支持。対象・編成ごとの倍率・補正範囲・丸めは引き続き要検証",
      "減衰→被ダメージUP→固定加算→与ダメージ増幅→切り上げの順は下書き。通常専用補正は適用しない",
      "有利属性の武器技巧100%以上は自動適用。100%未満の武器技巧抽選とキャラLBクリティカルは未接続。追加のバフクリティカルは入力条件",
      "主人公のジョブLv補正40%/20%・LB・選択済みジョブのコンプリート補正は主人公だけに自動加算（二次情報）",
      ...(!character && !resolution.protagonistAbilityCompletion.specified
        ? ["completedJobIds未入力のためアビリティのコンプリート補正は未反映（全取得を仮定しない）"] : []),
      ...(abilityId === "mythical-arms" ? [profile.multiplierStatus] : []),
      ...(weapons.supplementalDamage.effectiveAmount > 0 ? ["武器の敵最大HP依存与ダメージは加算上限値で計算（低HP敵は未検証）"] : []),
      ...(summons.enemyHpCapUnresolved || mastery.enemyHpCapUnresolved ? ["敵最大HP未入力のためHP依存の固定与ダメージは上限値で計算"] : []),
      ...artifact.unsupportedSkills.map((id) => `未接続アーティファクト: ${id}`),
      ...mastery.unsupportedBonuses.map((id) => `未接続強化: ${id}`)],
    sources: [profile.source,
      ...(profile.attenuationTableId ? ["https://gbf.wiki/User:Cajunwildcat/Skill_Attenuation"] : []),
      "https://kikumarogaming.com/granbluefantasy-damegecaplist/", "https://gbf.wiki/Damage_Formula/Detailed_Damage_Formula"],
  };
}
