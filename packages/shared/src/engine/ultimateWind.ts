import { areCombatTargetsContiguous, getCombatSeats } from "./seating";
import { HURRICANE_CAKES_ID, HURRICANE_ID, WIND_ELEMENT, WIND_INCOME_ID } from "../bigCards/abilities";
import type { GameState, PlayerId, PlayerState, SkillId } from "../types";
import { addCombatValues, combatValue, type CombatValue } from "./combatValues";
import { getElementValue, setElementValue } from "./elementResources";
import { getActiveSkillCount } from "./gameFactory";

export const HURRICANE_LINK = "hurricane_link";
export const WIND_HASTE = "wind_haste";
export const WIND_EYE = "wind_eye";
export const WIND_TRACK = "wind_track";
export const WIND_TRACE = "wind_trace";
export const WIND_HIT = "wind_hit";
export const WIND_RESTART = "wind_restart";
export const WIND_DEFENSE_PROGRESS = "wind_defense_progress";

export function isHurricane(skillId: SkillId): boolean {
  return skillId === HURRICANE_ID || skillId === HURRICANE_CAKES_ID;
}

export function getWindNeighbors(state: Pick<GameState, "players">, source: PlayerState): PlayerState[] {
  return getCombatSeats(state, source.spaceId);
}

export function validHurricaneTargets(state: Pick<GameState, "players">, source: PlayerState, ids: readonly PlayerId[]): boolean {
  const seats = state.players.filter((player) => player.status === "alive" && player.kind !== "spectator" &&
    (player.spaceId === source.spaceId || hasWindTrace(player, source.id)));
  const targets = new Set(ids);
  return targets.size === ids.length && ids.length >= 1 && ids.length <= 3 && !targets.has(source.id) &&
    ids.every((id) => seats.some((player) => player.id === id)) && areCombatTargetsContiguous(seats, ids);
}

export function addWindFromDefense(player: PlayerState, gained: CombatValue): void {
  const copies = getActiveSkillCount(player, WIND_INCOME_ID);
  if (!copies) return;
  const id = WIND_DEFENSE_PROGRESS;
  const prior = player.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
  const finite = (gained.find((term) => term.exponent === 0)?.coefficient ?? 0) + prior;
  const remainder = ((finite % 5) + 5) % 5;
  const wind = addCombatValues(gained.filter((term) => term.exponent > 0).map((term) =>
    ({ ...term, coefficient: term.coefficient * copies / 5 })), combatValue(Math.floor(finite / 5) * copies));
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  if (remainder) player.buffs.push({ id, name: "积风·防御值进度", stacks: remainder });
  if (wind.length) setElementValue(player, WIND_ELEMENT, addCombatValues(getElementValue(player, WIND_ELEMENT), wind));
}

export function hasWindTrace(target: PlayerState | undefined, sourceId: PlayerId | undefined): boolean {
  return Boolean(sourceId && target?.buffs.some((buff) => buff.stateType === WIND_TRACE && buff.sourcePlayerId === sourceId));
}

export function getWindPursuitTargets(state: Pick<GameState, "players" | "turnNumber">, source: PlayerState): PlayerState[] {
  return state.players.filter((target) => target.status === "alive" && hasWindTrace(target, source.id) &&
    source.buffs.some((buff) => buff.id === `${WIND_HIT}:${state.turnNumber}:${target.id}`));
}

/** Return each linked recipient once per original packet, including overlapping link groups. */
export function hurricaneRecipients(state: Pick<GameState, "players" | "roundNumber">, targetId: PlayerId): PlayerState[] {
  const reached = new Set<PlayerId>([targetId]);
  const groups = new Set<string>();
  for (const id of reached) {
    const target = state.players.find((player) => player.id === id);
    const fresh = target?.buffs.filter((buff) => buff.stateType === HURRICANE_LINK &&
      (buff.expiresAtRound ?? 0) > state.roundNumber && !groups.has(buff.id)) ?? [];
    if (!fresh.length) continue;
    fresh.forEach((buff) => groups.add(buff.id));
    for (const player of state.players) if (player.status === "alive" && player.spaceId === target?.spaceId &&
      player.buffs.some((buff) => fresh.some((group) => group.id === buff.id))) reached.add(player.id);
  }
  return state.players.filter((player) => player.id !== targetId && reached.has(player.id));
}
