import { z } from "zod";

export const FIGHTER_ORIGIN_ID = "100501";
export const FIGHTER_ORIGIN_UNRESOLVED = "オリファイ：確定連撃・奥義消費後の闘心Lv・Lv4以上の通常分割を接続。実HP減少1hitのLv5カウンター行動と+5ゲージは部分対応。闘心の攻防/クリティカル/与ダメ数値、装備/最大HPパッシブ、被弾ゲージ一般式、カウンターダメージ/タフネスは未対応。Lv50の対応アビは状態・発動のみで数値未計算、チャージ変換/ドーンは未実装。分割ダメージは既存の候補処理を使用し、倍率/丸めとダメージの実測一致は未確認。";
export const fighterLoadoutSchema = z.array(z.enum(["beast-fang", "ulfhedinn", "unlimited-boost"])).max(3)
  .refine(v => new Set(v).size === v.length, "アビリティの装備が重複しています");
export const fighterAbilitiesSchema = z.object({
  loadout: fighterLoadoutSchema,
  readyOnTurn: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative()]).default([1, 1, 1]),
  weaponBurstExpiresOnTurn: z.number().int().nonnegative().default(0),
  woolExpiresOnTurn: z.number().int().nonnegative().default(0),
  fangCapObserved: z.boolean().default(false),
  fangDebuffObserved: z.boolean().default(false),
  unlimitedPrepared: z.boolean().default(false),
  unlimitedUsed: z.boolean().default(false),
  endless: z.boolean().default(false),
}).strict().refine(v => !v.unlimitedPrepared || (v.unlimitedUsed && !v.endless), "アンリミ準備状態が不正です");
export const fighterOriginStateSchema = z.object({
  level: z.number().int().min(0).max(5).default(0),
  consumedGaugeRemainder: z.number().finite().min(0).lt(100).default(0),
  abilities: fighterAbilitiesSchema.optional(),
}).strict();
export type FighterOriginState = z.infer<typeof fighterOriginStateSchema>;

export function consumeFighterOriginGauge(state: FighterOriginState, consumed: number, jobLevel: number) {
  if (!Number.isFinite(consumed) || consumed < 0) throw new Error("Consumed gauge must be non-negative");
  const total = state.consumedGaugeRemainder + consumed;
  return fighterOriginStateSchema.parse({
    ...state,
    level: Math.min(jobLevel >= 40 ? 5 : 3, state.level + Math.floor(total / 100)),
    consumedGaugeRemainder: total % 100,
  });
}
