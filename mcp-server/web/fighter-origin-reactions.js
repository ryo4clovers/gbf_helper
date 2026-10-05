/** Shared partial reaction model. Actual HP loss is after barrier absorption.
 * incomingChargeGain is an explicit observed/input amount, never inferred from damage.
 * This currently supports one incoming hit on the protagonist per turn.
 */
export function resolveFighterOriginIncoming(input) {
  const { level, hpBefore, hpAfter, maxHp, chargeBefore, incomingChargeGain } = input;
  if (!Number.isInteger(level) || level < 0 || level > 5 ||
      ![hpBefore, hpAfter, maxHp, chargeBefore].every(Number.isFinite) || maxHp <= 0 ||
      hpBefore < 0 || hpAfter < 0 || hpBefore > maxHp || hpAfter > maxHp || chargeBefore < 0 || chargeBefore > 100 ||
      (incomingChargeGain !== undefined && (!Number.isFinite(incomingChargeGain) || incomingChargeGain < 0 || incomingChargeGain > 100))) {
    throw new Error("Invalid Fighter Origin incoming state");
  }
  const hpLost = Math.max(0, hpBefore - hpAfter);
  const warnings = [];
  const gain = hpLost > 0 ? incomingChargeGain ?? 0 : 0;
  if (hpLost > 0 && incomingChargeGain === undefined) warnings.push("オリファイ被弾ゲージ：+4/+8を観測したが一般式未確定のため、明示入力がない被弾ゲージは未加算");
  const chargeAfterIncoming = Math.min(100, chargeBefore + gain);
  const counterActions = hpLost > 0 && hpAfter > 0 && level === 5 ? 1 : 0;
  if (counterActions) warnings.push("闘心Lv5カウンター1行動とゲージ+5のみ接続。観測した2成分の分類・倍率が未確定のため、敵へのカウンターダメージは未加算");
  const turnEndThresholdReached = hpLost * 10 >= maxHp;
  if (turnEndThresholdReached) warnings.push("HP10%消費の終了強化は発動実測・累積数値が未確認のため未適用");
  return { hpLost, chargeAfterIncoming, counterActions, counterDamageSupported: false,
    chargeAfterCounter: Math.min(100, chargeAfterIncoming + counterActions * 5), turnEndThresholdReached, warnings };
}
