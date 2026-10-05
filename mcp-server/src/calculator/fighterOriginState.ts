import { z } from "zod";

export const FIGHTER_ORIGIN_ID = "100501";
export const FIGHTER_ORIGIN_UNRESOLVED = "オリファイ：確定連撃・奥義消費後の闘心Lv・Lv4以上の通常分割を接続。実HP減少1hitのLv5カウンター行動と+5ゲージは部分対応。闘心の攻防/クリティカル/与ダメ数値、装備/最大HPパッシブ、被弾ゲージ一般式、カウンターダメージ/タフネス、主人公アビリティは未対応。分割ダメージは既存の候補処理を使用し、倍率/丸めとダメージの実測一致は未確認。";
/** No-ability state. Direct level gains from Weapon Burst are outside this model. */
export const fighterOriginStateSchema = z.object({
  level: z.number().int().min(0).max(5).default(0),
  consumedGaugeRemainder: z.number().finite().min(0).lt(100).default(0),
}).strict();
export type FighterOriginState = z.infer<typeof fighterOriginStateSchema>;

export function consumeFighterOriginGauge(state: FighterOriginState, consumed: number, jobLevel: number) {
  if (!Number.isFinite(consumed) || consumed < 0) throw new Error("Consumed gauge must be non-negative");
  const total = state.consumedGaugeRemainder + consumed;
  return fighterOriginStateSchema.parse({
    level: Math.min(jobLevel >= 40 ? 5 : 3, state.level + Math.floor(total / 100)),
    consumedGaugeRemainder: total % 100,
  });
}
