import type { BuffState, GameState, PlayerState } from "../types";
import { negativeStatusesHaveNoEffect } from "./effectCategories";

export const TALISMAN_ELEMENTS = ["fire", "water", "wood"] as const;
export type Talisman = typeof TALISMAN_ELEMENTS[number];
export const WATER_TALISMAN_INVALIDATION = "triple_talisman_water_invalidation";
export const talismanStatusId = (kind: Talisman) => `triple_talisman:${kind}`;

export function talismanState(player: PlayerState, kind: Talisman, round?: number): BuffState | undefined {
  return player.buffs.find((buff) => buff.id === talismanStatusId(kind) && (round === undefined || (buff.expiresAtRound ?? Infinity) > round));
}

export function hasTalisman(player: PlayerState | undefined, kind: Talisman, round?: number): boolean {
  if (!player) return false;
  const status = talismanState(player, kind, round);
  return Boolean(status && (status.uncleansable || !negativeStatusesHaveNoEffect(player)));
}

export function excludedByTripleSeal(player: PlayerState): boolean {
  return TALISMAN_ELEMENTS.every((kind) => talismanState(player, kind)?.uncleansable === true);
}

export function isTalismanState(buff: BuffState): boolean {
  return TALISMAN_ELEMENTS.some((kind) => buff.id === talismanStatusId(kind));
}

export function preservePermanentTalismans(current: PlayerState, restored: PlayerState): void {
  if (!excludedByTripleSeal(current)) return;
  restored.buffs = restored.buffs.filter((buff) => !isTalismanState(buff));
  restored.buffs.push(...current.buffs.filter((buff) => isTalismanState(buff) && buff.uncleansable).map((buff) => ({ ...buff })));
}

export function isWaterTalismanTurn(player: PlayerState, state: Pick<GameState, "roundNumber" | "turnNumber">): boolean {
  return hasTalisman(player, "water", state.roundNumber) && player.buffs.some((buff) =>
    buff.id === WATER_TALISMAN_INVALIDATION && buff.expiresAtTurn === state.turnNumber + 1);
}
