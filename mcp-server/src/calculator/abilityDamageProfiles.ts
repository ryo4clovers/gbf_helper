import type { AbilityDamageProfile } from "./abilityDamageProfile.js";

/**
 * Initial profiles backed by either in-game observations or in-game effect text.
 * Keep unresolved attenuation explicit instead of filling it from a generic table.
 */
export const ABILITY_DAMAGE_PROFILES = {
  "1000": {
    schemaVersion: 1,
    abilityId: "1000",
    name: "アーマーブレイク",
    element: "own",
    targeting: "single",
    variants: [
      {
        id: "normal-mode",
        condition: { type: "enemy-mode", mode: "normal" },
        multiplier: { min: 1, max: 1 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "検証済み",
        source: "in-game-observations-2026-09-15",
        confirmedAt: "2026-09-15",
        notes: "編成②〜⑦の70hitから固有1.0倍＋アビダメUP34%（実効1.34倍）を確認。減衰未到達の最大入力は約301,532。編成⑧11hitで第1段階、編成⑨10hitで第2段階への到達を検出。基礎第1候補300,000・70%、第2候補400,000・40%、上限UP17%、後段与ダメージUP3.6%で最大1差。ライン位置・途中丸めは要検証。有利属性の編成⑨9hitも属性枠2.93→3.43、後段8.6%で最大1差。第2区間は減衰前約574,817まで継続を支持。火力増加の編成⑩10hitは第3段階を支持。予測値から逆算した基礎値と基礎第3候補500,000・10%で最大1差、入力約621,693〜678,388。通常攻撃実測による基礎値の独立検証は未実施。高火力編成⑪の10hitは全件クリティカルで540,097〜541,388。補正未分離の参考観測であり第4ラインの確定には用いない。2026-09-20にアビダメLB ID 5・32とも★0の低火力編成で20hit（8,395〜9,270）を取得し、既存の実効1.34倍モデルとの整合を確認。続くID 5のみ★3（+5%）の22hit（8,764〜9,607）は実効1.39倍、ID 5・32とも★3（合計+10%）の17hit（9,079〜9,810）は実効1.44倍と整合する。+10%を倍率全体へ乗算する候補は最小観測が既知乱数下限を外れ、同一編成継続の前提ではLBの割合ポイント加算を支持する。後2件のエクスポートには編成レスポンスがないため、同一編成の独立確認は保留。第4ライン600,000は武器計算対応拡充後の再検証までの仮置きで、実測確認値ではない。第4通過率と累積減衰値は未確認。",
      },
      {
        id: "non-normal-fallback",
        condition: { type: "always" },
        multiplier: { min: 1, max: 1 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "normal-mode-observation-extrapolation",
        notes: "OD・ブレイク中は未検証。通常モードの固有倍率を暫定使用。",
      },
    ],
  },
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
        multiplier: { min: 1.5, max: 1.5 },
        hitCount: 1,
        attenuation: {
          status: "partial",
          profile: {
            id: "ability-2040-normal-partial",
            name: "ドライブバースト 通常モード（一部検証済み）",
            lines: [{ threshold: 100_000, passRate: 0.6 }],
          },
        },
        verificationStatus: "検証済み",
        source: "in-game-observations-2026-09-14-to-2026-09-15",
        confirmedAt: "2026-09-15",
        notes:
          "固有倍率1.5倍にアカウント由来のアビダメUP34%を加算した実効1.84倍で実測を再現。基礎第1ライン100,000・60%を、上限補正17%込みの実効117,000で確認。基礎第2候補200,000・30%、第3候補300,000・10%、第4候補400,000・5%は要検証。",
      },
      {
        id: "non-normal-fallback",
        condition: { type: "always" },
        multiplier: { min: 1.5, max: 1.5 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "normal-mode-observation-extrapolation",
        notes: "ブレイク中は未検証。normal-mode variantの固有倍率を暫定使用。",
      },
    ],
  },
} as const satisfies Record<string, AbilityDamageProfile>;

export function findAbilityDamageProfile(abilityId: string): AbilityDamageProfile | undefined {
  return ABILITY_DAMAGE_PROFILES[abilityId as keyof typeof ABILITY_DAMAGE_PROFILES];
}
