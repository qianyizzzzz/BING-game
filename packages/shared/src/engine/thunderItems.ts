import type { GameState, PlayerState } from "../types";
import { INVENTORY_ITEM_STATE_TYPE } from "./effectCategories";
import { createId } from "./gameFactory";

export const THUNDER_BALL = "雷球";
export const THUNDER_RITE_STATE = "thunder_rite";

export function thunderBallCount(player: Pick<PlayerState, "buffs"> | undefined): number {
  return player?.buffs.filter((buff) => buff.stateType === INVENTORY_ITEM_STATE_TYPE && buff.itemKind === THUNDER_BALL).length ?? 0;
}

export function hasThunderRite(player: Pick<PlayerState, "buffs"> | undefined, round: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === THUNDER_RITE_STATE && (buff.expiresAtRound ?? 0) > round));
}

export function thunderBallCapacity(player: Pick<PlayerState, "buffs">, round: number): number {
  return hasThunderRite(player, round) ? 20 : 10;
}

export function grantThunderBalls(state: Pick<GameState, "roundNumber">, player: PlayerState, count: number,
  firstRound = state.roundNumber): number {
  const capacity = thunderBallCapacity(player, firstRound);
  const added = Math.min(count, Math.max(0, capacity - thunderBallCount(player)));
  for (let index = 0; index < added; index++) {
    player.buffs.push({ id: createId("thunder_ball"), name: THUNDER_BALL, stateType: INVENTORY_ITEM_STATE_TYPE,
      itemKind: THUNDER_BALL, stacks: 1, expiresAtRound: firstRound + 3 });
  }
  return added;
}

/** Consume the balls due to expire first. Each remaining ball keeps its own timer. */
export function spendThunderBalls(player: PlayerState, count: number): boolean {
  if (thunderBallCount(player) < count) return false;
  const balls = player.buffs.filter((buff) => buff.stateType === INVENTORY_ITEM_STATE_TYPE && buff.itemKind === THUNDER_BALL);
  const spent = new Set(balls.sort((a, b) => (a.expiresAtRound ?? Infinity) - (b.expiresAtRound ?? Infinity)).slice(0, count));
  player.buffs = player.buffs.filter((buff) => !spent.has(buff));
  return true;
}
