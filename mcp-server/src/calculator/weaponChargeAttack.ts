import { z } from "zod";
import { calculateProfileDamage, type SkillDamageProfile } from "./automaticAbilityDamage.js";
import { PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES as TABLES } from "./damageAttenuationCalculator.js";
import { resolveDamageCalculationRequest, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";

/** Only explicitly researched upgrade stages are selectable; grid weapons never supply a CA. */
export function resolveWeaponChargeAttack(main?: { masterId: string; level?: number; uncapLevel?: number }) {
  // Legacy imported decks omit uncapLevel; Lv150 itself requires the only supported 4★ stage.
  if (main?.masterId === "1040014300" && (main.uncapLevel === undefined || main.uncapLevel === 4) && main.level === 150) {
    return { id: "fallen-sword" as const, name: "フォールン・スラッシュ＋＋", multiplier: 5,
      attenuation: TABLES.chargeAttackMassive, source: "https://gbf.wiki/Fallen_Sword" };
  }
  if (main?.masterId === "1040315100" && main.level === 250) {
    return { id: "ereshkigal" as const, name: "エクル・クルヌギア＋", multiplier: 10.5,
      attenuation: { id: "ereshkigal-charge-candidate", name: "極大奥義・標準表1.5倍の候補",
        lines: TABLES.chargeAttackMassive.lines.map((line) => ({ ...line, threshold: line.threshold * 1.5 })) },
      source: "https://gbf.wiki/Ereshkigal" };
  }
  return undefined;
}

export const weaponChargeStateSchema = z.object({
  darkAttackStacks: z.number().int().min(0).max(3).default(0),
  criticalExpiresOnTurn: z.number().int().min(0).max(105).default(0),
  tripleAttackExpiresOnTurn: z.number().int().min(0).max(103).default(0),
}).strict();

export function calculateWeaponChargeDamage(calculation: NormalAttackCalculationRequest, criticalDamageBonusPercent = 0) {
  const { resolution } = resolveDamageCalculationRequest(calculation);
  const weapon = resolveWeaponChargeAttack(resolution.deck.weapons.find((entry) => entry.position === "main"));
  if (!weapon) throw new Error("メイン武器の奥義は未対応です。現在はフォールン・ソード4凸Lv150、エレシュキガルLv250に対応しています");
  const profile: SkillDamageProfile = { ...weapon, element: "character", characterId: undefined,
    fixedChargeDamage: weapon.id === "fallen-sword" ? 4000 : 2000, multiplierStatus: "二次情報・要検証" };
  const result = calculateProfileDamage(calculation, weapon.id, profile, criticalDamageBonusPercent, "charge", 1);
  return { ...result, modelVersion: "weapon-charge-candidate-v1", weaponId: weapon.id,
    attenuationEvidence: { status: "候補" as const, source: weapon.source },
    issues: [weapon.id === "fallen-sword"
      ? "フォールンの固定加算4000は提供ログの奥義4発に一致する候補。独立した編成・境界で要検証"
      : "エレシュキガルの倍率はWiki、固定加算2000は仮置きで実測照合が必要",
      weapon.id === "fallen-sword" ? "標準奥義減衰表を使用。内部減衰ID・丸めは未確認"
        : "極大奥義の減衰は概算上限2527500から標準表1.5倍を仮置き。4ラインは未検証",
      "奥義専用武器スキル・ジョブ固有奥義補正・武器技巧抽選・上限貫通・チェインバーストは未対応",
      ...result.issues.filter((issue) => /HP依存|未接続/.test(issue))] };
}
