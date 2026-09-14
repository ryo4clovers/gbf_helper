import type { AbilityDamageProfile } from "./abilityDamageProfile.js";

/**
 * Initial profiles backed by either in-game observations or in-game effect text.
 * Keep unresolved attenuation explicit instead of filling it from a generic table.
 */
export const ABILITY_DAMAGE_PROFILES = {
  "2040": {
    schemaVersion: 1,
    abilityId: "2040",
    name: "ドライブバースト",
    element: "own",
    targeting: "single",
    variants: [
      {
        id: "overdrive",
        condition: { type: "enemy-mode", mode: "overdrive" },
        multiplier: { min: 3, max: 3 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "in-game-effect-text",
        notes: "効果文の3倍は確認済みだが、OD中の実ダメージは未取得。",
      },
      {
        id: "normal-mode",
        condition: { type: "enemy-mode", mode: "normal" },
        multiplier: { min: 1.84, max: 1.84 },
        hitCount: 1,
        attenuation: {
          status: "partial",
          profile: {
            id: "ability-2040-normal-partial",
            name: "ドライブバースト 通常モード（一部検証済み）",
            lines: [{ threshold: 117_000, passRate: 0.6 }],
          },
        },
        verificationStatus: "検証済み",
        source: "in-game-observations-2026-09-14-to-2026-09-15",
        confirmedAt: "2026-09-15",
        notes: "第1ライン117,000・超過分60%通過を確認。第2候補234,000・30%、第3候補351,000・10%は要検証。編成⑦は第3候補で最大1ダメージ差。",
      },
      {
        id: "non-normal-fallback",
        condition: { type: "always" },
        multiplier: { min: 1.84, max: 1.84 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "normal-mode-observation-extrapolation",
        notes: "ブレイク中は未検証。normal-mode variantの観測値を暫定使用。",
      },
    ],
  },
} as const satisfies Record<string, AbilityDamageProfile>;

export function findAbilityDamageProfile(abilityId: string): AbilityDamageProfile | undefined {
  return ABILITY_DAMAGE_PROFILES[abilityId as keyof typeof ABILITY_DAMAGE_PROFILES];
}
