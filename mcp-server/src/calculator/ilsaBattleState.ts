import { z } from "zod";
import type { BattleDamageEffects } from "./battleDamageEffects.js";

export const ILSA_ID = "3040456000";
export const ilsaBattleStateSchema = z.object({
  flowers: z.number().int().min(1).max(3),
  readyOnTurn: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative()]),
  warEternalExpiresOnTurn: z.number().int().nonnegative(),
  sinExpiresOnTurn: z.number().int().nonnegative(),
  multistrikeTurn: z.number().int().nonnegative(),
  multistrikeActions: z.number().int().min(1).max(4),
}).strict();
export type IlsaBattleState = z.infer<typeof ilsaBattleStateSchema>;

export function initialIlsaState(): IlsaBattleState {
  return { flowers: 1, readyOnTurn: [1, 1, 1], warEternalExpiresOnTurn: 0,
    sinExpiresOnTurn: 0, multistrikeTurn: 0, multistrikeActions: 1 };
}

/** Expiry is exclusive; a five-turn buff cast on turn 1 lasts through turn 5. */
export function castIlsaAbility(state: IlsaBattleState, turn: number, ability: 1 | 2 | 3): IlsaBattleState {
  if (turn < state.readyOnTurn[ability - 1]) throw new Error(`イルザ${ability}アビは再使用待ちです`);
  const next = structuredClone(state);
  next.readyOnTurn[ability - 1] = turn + [12, 8, 9][ability - 1];
  if (ability === 1) next.warEternalExpiresOnTurn = turn + 5;
  if (ability === 2) next.sinExpiresOnTurn = turn + 4 + state.flowers;
  if (ability === 3) {
    next.multistrikeTurn = turn;
    next.multistrikeActions = state.flowers + 1;
  }
  return next;
}

export function resetIlsaOnCharge(state: IlsaBattleState, turn: number): IlsaBattleState {
  const next = structuredClone(state);
  next.readyOnTurn[1] = turn;
  return next;
}

export function ilsaOnAllyDefeat(state: IlsaBattleState, turn: number, count: number): IlsaBattleState {
  if (!count) return state;
  return { ...state, flowers: Math.min(3, state.flowers + count), readyOnTurn: [turn, turn, turn] };
}

/** Skill Side A is a separate echo frame; same-frame effects take the maximum. */
export function applyIlsaBattleEffects(effects: BattleDamageEffects, state: IlsaBattleState | undefined,
  turn: number, darkAlly: boolean): BattleDamageEffects {
  if (!state) return effects;
  const buff = darkAlly && turn < state.warEternalExpiresOnTurn;
  return { ...effects,
    enemyDefenseDownPercent: (effects.enemyDefenseDownPercent ?? 0) + (turn < state.sinExpiresOnTurn ? 25 : 0),
    ...(buff ? { abilityNormalPursuitPercent: Math.max(effects.abilityNormalPursuitPercent ?? 0, 20),
      criticalDamageBonusPercent: Math.max(effects.criticalDamageBonusPercent ?? 0, 20),
      damageCapPercent: Math.max(effects.damageCapPercent ?? 0, 15) } : {}),
  };
}
