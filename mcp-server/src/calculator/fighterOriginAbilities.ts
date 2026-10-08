import { fighterAbilitiesSchema, fighterOriginStateSchema, consumeFighterOriginGauge, type FighterOriginState } from "./fighterOriginState.js";
import { beastFangPreAttenuationDamage } from "./beastFangDamage.js";
import type { NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";

export type FighterAbility = "weapon-burst" | "beast-fang" | "ulfhedinn" | "unlimited-boost";
export type FighterTrigger = "manual" | "ulfhedinn" | "endless";
export type FighterAbilityEvent = {
  kind: "fighter-ability"; actorPosition: 0; name: string; ability: FighterAbility;
  trigger: FighterTrigger; hitCount: 0 | 1; damage: null; calculationStatus: "未計算";
  preAttenuationDamage?: ReturnType<typeof beastFangPreAttenuationDamage>;
  debuffOutcome?: "hit" | "miss" | "unknown";
  triggerOrderVerified: boolean;
};
export const FIGHTER_ABILITY_WARNING = "オリファイアビ：発動回数・ゲージ・闘心・期限・無窮TA保証・置換奥義の全回復/弱体解除/全ディスペルに対応。ビーストファングは減衰前参照・命中明示時の攻防DOWN・自上限に対応。減衰後ダメージは未計算。ウェポンバースト/ウールヴ/無窮の数値強化・追撃・置換奥義は未計算。表示ダメージと敵HPは対応済み成分だけで、総ダメージではありません。共存する自動発動の先後は未識別。";

/** Loadout is immutable during a battle; omitted on continuation means reuse it. */
export function configureFighterAbilities(state: FighterOriginState, loadout?: string[]): FighterOriginState {
  if (!loadout) return state;
  if (state.abilities && JSON.stringify([...state.abilities.loadout].sort()) !== JSON.stringify([...loadout].sort())) {
    throw new Error("戦闘開始後にオリファイの装備アビリティは変更できません");
  }
  return fighterOriginStateSchema.parse({ ...state, abilities: state.abilities ?? fighterAbilitiesSchema.parse({ loadout }) });
}

/** The same execution handles manual and normal-action triggers. Never invent a damage profile. */
export function castFighterAbility(input: FighterOriginState, turn: number, gauge: number, ability: FighterAbility,
  trigger: FighterTrigger = "manual", triggerOrderVerified = true,
  context?: { calculation: NormalAttackCalculationRequest; elapsedSeconds: number },
  elapsedSeconds = context?.elapsedSeconds ?? 0) {
  const state = structuredClone(input);
  const a = state.abilities;
  if (!a || (ability !== "weapon-burst" && !a.loadout.includes(ability))) throw new Error("装備していないアビリティです");
  const slot = ability === "weapon-burst" ? 0 : ability === "beast-fang" ? 1 : 2;
  if (trigger !== "manual" && ability !== "beast-fang") throw new Error("この自動アビリティは未対応です");
  if (trigger === "manual") {
    if (turn < a.woolExpiresOnTurn) throw new Error("ウールヴ効果中は手動アビリティを使用できません");
    if (ability === "unlimited-boost") {
      if (a.unlimitedUsed || state.level !== 5) throw new Error("アンリミは闘心5かつ未使用時のみ使用できます");
    } else if (turn < a.readyOnTurn[slot]) throw new Error("アビリティは再使用待ちです");
  }
  const name = { "weapon-burst": "ウェポンバーストIV＋", "beast-fang": "ビーストファング", "ulfhedinn": "ウールヴヘジン", "unlimited-boost": "アンリミテッド・ブースト" }[ability];
  if (ability === "weapon-burst") {
    gauge = 100;
    state.level = Math.min(5, state.level + 1); // Direct gain does not consume gauge/remainder.
    a.weaponBurstExpiresOnTurn = turn + 3;
    a.readyOnTurn[0] = turn + 5;
  } else if (ability === "ulfhedinn") {
    if (gauge !== 100) throw new Error("ウールヴはゲージ100%の観測範囲に対応しています");
    gauge -= 100;
    const consumed = consumeFighterOriginGauge(state, 100, 50);
    state.level = consumed.level;
    state.consumedGaugeRemainder = consumed.consumedGaugeRemainder;
    a.woolExpiresOnTurn = turn + 4;
    a.readyOnTurn[2] = turn + 5;
  } else if (ability === "beast-fang") {
    a.fangDebuffObserved = true;
    a.fangCapObserved = true;
    if (context?.calculation.beastFangDebuffHit === true) a.fangDebuffExpiresAt = elapsedSeconds + 180;
    a.fangCapExpiresOnTurn = turn + 2; // Refresh candidate; not a buff-duration extension operation.
    if (trigger === "manual") a.readyOnTurn[1] = turn + 7;
  } else {
    a.unlimitedPrepared = a.unlimitedUsed = true;
  }
  // Context must represent the state BEFORE this cast's debuff/cap are applied.
  const event: FighterAbilityEvent = { kind: "fighter-ability", actorPosition: 0, name, ability, trigger,
    hitCount: ability === "beast-fang" ? 1 : 0, damage: null, calculationStatus: "未計算", triggerOrderVerified,
    ...(ability === "beast-fang" && context ? { preAttenuationDamage: beastFangPreAttenuationDamage(context.calculation),
      debuffOutcome: context.calculation.beastFangDebuffHit === undefined ? "unknown" as const : context.calculation.beastFangDebuffHit ? "hit" as const : "miss" as const } : {}),
  };
  return { state, gauge, event };
}

export function fighterNormalTriggers(state: FighterOriginState, turn: number): FighterTrigger[] {
  const a = state.abilities;
  if (!a?.loadout.includes("beast-fang")) return [];
  // Stable internal order only. The log cannot identify which of the two identical casts fires first.
  return [...(turn < a.woolExpiresOnTurn ? ["ulfhedinn" as const] : []), ...(a.endless ? ["endless" as const] : [])];
}
