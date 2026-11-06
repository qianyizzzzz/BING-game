import type { DamageEvent, GameState, PlayerId } from "../types";

export function getSkillDamageSourceIds(event: Pick<DamageEvent, "sourceId" | "reboundSkillSourceIds">): PlayerId[] {
  return [...(event.sourceId ? [event.sourceId] : []), ...(event.reboundSkillSourceIds ?? [])];
}

/** Each committed health settlement replaces the preceding batch, including a batch ending at zero HP. */
export function getFatalDamageEvents(state: GameState, playerId: PlayerId): DamageEvent[] {
  const recorded = state.damageAttribution?.[playerId];
  const ids = recorded === undefined ? undefined : new Set(recorded);
  return state.eventLog.filter((event): event is DamageEvent => event.type === "damage" &&
    event.targetId === playerId && event.amount > 0 && (ids ? ids.has(event.id) :
      event.roundNumber === state.roundNumber && event.turnNumber === state.roundTurnNumber));
}

export function getFatalDamageSourceIds(state: GameState, playerId: PlayerId): PlayerId[] {
  return [...new Set(getFatalDamageEvents(state, playerId).flatMap((event) => event.sourceId ? [event.sourceId] : []))];
}
