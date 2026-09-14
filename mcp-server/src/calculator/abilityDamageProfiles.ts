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
        attenuation: { status: "unresolved" },
        verificationStatus: "検証済み",
        source: "in-game-observations-2026-09-14",
        confirmedAt: "2026-09-14",
        notes: "11/11件を再現。減衰前39,028.434までは減衰なし。",
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
