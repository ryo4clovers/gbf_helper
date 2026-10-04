import { calculateProfileDamage, type SkillDamageProfile } from "./automaticAbilityDamage.js";
import { PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES } from "./damageAttenuationCalculator.js";
import type { NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
import { ILSA_ID } from "./ilsaBattleState.js";

/** Four-line candidate from 85 observed hits; intermediate segments and rounding remain unverified. */
export function ilsaSinProfile(flowers: number): SkillDamageProfile {
  if (!Number.isInteger(flowers) || flowers < 1 || flowers > 3) throw new Error("不散花は1〜3個です");
  const step = (flowers + 2) * 100_000;
  return { name: "ウェイジズ・オブ・シン＋", multiplier: 5 + flowers * 1.5, element: "character", characterId: ILSA_ID,
    actionId: "235521", source: "knowledge/abilities/damage-profiles.md", multiplierStatus: "実測支持・要検証",
    attenuation: { id: `ilsa-sin-${flowers}-candidate`, name: `不散花${flowers}個・実測候補`,
      lines: [.8, .6, .4, .01].map((passRate, i) => ({ threshold: step * (i + 3), passRate })) } };
}

export function calculateIlsaDamage(calculation: NormalAttackCalculationRequest, kind: "ability" | "charge", flowers: number) {
  const profile: SkillDamageProfile = kind === "ability" ? ilsaSinProfile(flowers) : {
    name: "バースト・イレイザー", multiplier: 4.5, fixedChargeDamage: 2000, element: "character", characterId: ILSA_ID,
    attenuation: PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.chargeAttackMassive,
    source: "https://gbf.wiki/User:Cajunwildcat/Skill_Attenuation", multiplierStatus: "二次情報・要検証",
  };
  const result = calculateProfileDamage(calculation, kind === "ability" ? "ilsa-sin" : "ilsa-charge", profile, 0, kind, 1);
  return { ...result, modelVersion: "ilsa-skill-candidate-v3", attenuationEvidence: { status: "候補" as const,
    source: kind === "ability" ? "共通4ライン仮説。上限増加分ceil・渾身精度保持で旧減衰診断85/85一致、追加2戦8発一致。内部ID未取得" : "Wiki標準奥義表・ユーザー指定" },
    issues: [
      kind === "ability" ? "不散花別の4ラインは実測候補。2個60%・1個40%区間と丸めは追加検証が必要"
        : "奥義は4.5倍・固定加算2000・標準減衰表の下書き。キャラ覚醒と登録済みの武器覚醒補正を反映。その他の奥義専用武器スキルは未接続",
      "上限貫通と上限増加分の切り上げを適用。1アビの確定クリティカルは有利属性に適用",
      ...result.issues.filter((issue) => /HP依存|未接続/.test(issue)),
    ] };
}
