export interface FighterOriginIncomingInput {
  level: number; hpBefore: number; hpAfter: number; maxHp: number; chargeBefore: number; incomingChargeGain?: number;
}
export function resolveFighterOriginIncoming(input: FighterOriginIncomingInput): {
  hpLost: number; chargeAfterIncoming: number; counterActions: number; counterDamageSupported: boolean;
  chargeAfterCounter: number; turnEndThresholdReached: boolean; warnings: string[];
};
