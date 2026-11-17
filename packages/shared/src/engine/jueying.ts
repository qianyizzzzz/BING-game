import { isCorrupted } from "./corruptionIds";
import { BIG_CARD_SKILLS, bigCardHasAbility, JUEYING_DEATH_ID, JUEYING_RESTRICTION_ID } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import type { GameState, PlayerState } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { shareSpace } from "./spaces";
import { tianmangSkillImmunity } from "./tianmang";

export const REVERSAL_USE_BONUS = "jueying_reversal_uses";
export const JUEYING_HARVEST = "jueying_harvest";

export function hasJueyingRestriction(state: Pick<GameState, "players" | "roundNumber" | "turnNumber">, target: PlayerState): boolean {
  return state.players.some((owner) => (owner.id !== target.id || BIG_CARD_SKILLS[JUEYING_RESTRICTION_ID]?.moveResolution?.mustResolve ||
    owner.buffs.some((buff) => buff.sourceAbilityId === JUEYING_RESTRICTION_ID && buff.moveResolution?.mustResolve &&
      (buff.expiresAtRound ?? Infinity) > state.roundNumber && (buff.expiresAtTurn ?? Infinity) >= state.turnNumber)) &&
    owner.status === "alive" && !tianmangSkillImmunity(target, owner.id, state.turnNumber) &&
    shareSpace(owner, target) && getActiveSkillCount(owner, JUEYING_RESTRICTION_ID) > 0);
}

export function canRestoreTemporalState(state: GameState, target: PlayerState): boolean {
  return target.defeatLevel !== 6 && !isCorrupted(target) && !hasJueyingRestriction(state, target);
}

export function getJueyingDeaths(state: Pick<GameState, "players">, target: PlayerState):
  Array<{ owner: PlayerState; cards: BigCardInstance[] }> {
  return state.players.flatMap((owner) => {
    if (owner.status !== "dead" || owner.defeatLevel !== 1 || !shareSpace(owner, target) ||
      getActiveSkillCount(owner, JUEYING_DEATH_ID) === 0) return [];
    return [{ owner, cards: (owner.bigCards ?? []).filter((card) => !card.junengDisabled && bigCardHasAbility(card, JUEYING_DEATH_ID)) }];
  });
}

export function hasJueyingDeathAura(state: Pick<GameState, "players">, target: PlayerState): boolean {
  return getJueyingDeaths(state, target).length > 0;
}
