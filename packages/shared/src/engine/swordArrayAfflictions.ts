import type { GameState, PlayerId } from "../types";
import { applyNegativeStatus } from "./negativeStatuses";
import { SWORD_ARRAY_NO_CAKE_ID, SWORD_ARRAY_NO_CAKE_STATE, SWORD_ARRAY_PI_ID, SWORD_ARRAY_PI_STATE } from "./swordArrayIds";

export function applySwordArrayPi(state: GameState, targetId: PlayerId, sourceId: PlayerId): boolean {
  return applyNegativeStatus(state, targetId, SWORD_ARRAY_PI_STATE, (target, appliedBy) => {
    if (!target.buffs.some((buff) => buff.stateType === SWORD_ARRAY_PI_STATE)) {
      target.buffs.push({ id: SWORD_ARRAY_PI_STATE, stateType: SWORD_ARRAY_PI_STATE, name: "玄空·圆周", stacks: 1,
        sourceAbilityId: SWORD_ARRAY_PI_ID, ...(appliedBy ? { sourcePlayerId: appliedBy } : {}) });
    }
  }, sourceId);
}

export function applySwordArrayNoCake(state: GameState, targetId: PlayerId, sourceId: PlayerId): boolean {
  return applyNegativeStatus(state, targetId, SWORD_ARRAY_NO_CAKE_STATE, (target, appliedBy) => {
    const expiresAtRound = state.roundNumber + 2;
    const existing = target.buffs.find((buff) => buff.stateType === SWORD_ARRAY_NO_CAKE_STATE);
    if (existing) existing.expiresAtRound = Math.max(existing.expiresAtRound ?? 0, expiresAtRound);
    else target.buffs.push({ id: SWORD_ARRAY_NO_CAKE_STATE, stateType: SWORD_ARRAY_NO_CAKE_STATE, name: "幻梦·归虚", stacks: 1,
      sourceAbilityId: SWORD_ARRAY_NO_CAKE_ID, expiresAtRound, ...(appliedBy ? { sourcePlayerId: appliedBy } : {}) });
  }, sourceId);
}
