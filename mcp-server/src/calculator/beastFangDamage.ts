import { calculateProfileDamage, type SkillDamageProfile } from "./automaticAbilityDamage.js";
import type { NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
import type { FighterOriginState } from "./fighterOriginState.js";

export const BEAST_FANG_SOURCE = "https://gbf.wiki/index.php?title=Berserker&oldid=1004023";
export const BEAST_FANG_WARNING = "ビーストファング：4倍・攻防25%DOWN(片面180秒)・自分全上限50%UP(2T)は公開二次情報。Fang自身の減衰設定未取得のためdamage:null、減衰前参照値のみ（HPへ未加算）。弱体命中未指定は新規付与なし。枠不明の既存防御DOWNとは非加算の最大値（別枠なら過小評価）、上限バフも最大値。枠競合・再付与による期限更新は未検証。無窮/ウールヴ等の未接続強化で実測値とは一致しない場合があります。";

const profile: SkillDamageProfile = {
  name: "ビーストファング", multiplier: 4, element: "character", characterId: undefined,
  source: BEAST_FANG_SOURCE, multiplierStatus: "公開二次情報・実測未確定",
  attenuation: { id: "beast-fang-pre-attenuation", name: "減衰前参照（HP加算不可）", lines: [] },
};

/** No attenuation hypothesis is used in this pre-cap reference. Not an HP packet. */
export function beastFangPreAttenuationDamage(calculation: NormalAttackCalculationRequest, criticalDamageBonusPercent = 0) {
  const result = calculateProfileDamage(calculation, "beast-fang", profile, criticalDamageBonusPercent, "ability", 1);
  return { verificationStatus: "下書き" as const, kind: "pre-attenuation-reference" as const,
    trace: result.trace, predictions: result.predictions.map(({ randomMultiplier }) => ({ randomMultiplier,
      damage: result.trace.commonPreAbilityDamage * result.trace.effectiveMultiplier * randomMultiplier * (1 + result.criticalDamageBonusPercent / 100) })),
    sources: [BEAST_FANG_SOURCE],
    issues: [BEAST_FANG_WARNING, "減衰・減衰後増幅・固定与ダメージ・丸めを含まない参照値。HPへ適用不可。武器奥義クリティカルの抽選分岐はこの参照値へ未反映",
      ...result.issues.filter(issue => /未入力|未接続/.test(issue))] };
}

/** Apply once to effects before the cast; actor buffs never leak to allies. */
export function applyBeastFangEffects(effects: NormalAttackCalculationRequest["battleEffects"], state: FighterOriginState | undefined,
  turn: number, elapsedSeconds: number, protagonist: boolean) {
  const a = state?.abilities;
  return { ...effects,
    enemyDefenseDownPercent: Math.max(effects?.enemyDefenseDownPercent ?? 0, elapsedSeconds < (a?.fangDebuffExpiresAt ?? 0) ? 25 : 0),
    damageCapPercent: Math.max(effects?.damageCapPercent ?? 0, protagonist && turn < (a?.fangCapExpiresOnTurn ?? 0) ? 50 : 0),
  };
}

/** Fang/Ilsa attack-down interaction has no frame input: same 25% takes maximum. */
export function beastFangEnemyAttackMultiplier(state: FighterOriginState | undefined, elapsedSeconds: number, ilsaActive = false) {
  return elapsedSeconds < (state?.abilities?.fangDebuffExpiresAt ?? 0) || ilsaActive ? .75 : 1;
}
