import { GameState, PlayerId, SkillId } from "../types";
import { createBaseEvent, findPlayer } from "./gameFactory";
import { getSkill } from "../skills/registry";

export const RETALIATION_RESPONSE_LIMIT = 1000;

/** Counts belong to the player and skill ID, independent of buffs, revival and fusion covers. */
export function getRetaliationResponseCount(state: GameState, playerId: PlayerId, skillId: SkillId): number {
  return state.retaliationResponses?.turnNumber === state.turnNumber
    ? state.retaliationResponses.counts[playerId]?.[skillId] ?? 0 : 0;
}

/** Reserve responses when their effects are generated, even if the eventual damage is immune. */
export function takeRetaliationResponses(state: GameState, playerId: PlayerId, skillId: SkillId, requested = 1,
  responseName?: string): number {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive" || !Number.isFinite(requested) || requested < 1) return 0;
  if (state.retaliationResponses?.turnNumber !== state.turnNumber) {
    state.retaliationResponses = { turnNumber: state.turnNumber, counts: {} };
  }
  const counts = state.retaliationResponses.counts[playerId] ??= {};
  const before = counts[skillId] ?? 0;
  const granted = Math.min(Math.floor(requested), RETALIATION_RESPONSE_LIMIT - before);
  if (granted <= 0) return 0;
  counts[skillId] = before + granted;
  if (counts[skillId] === RETALIATION_RESPONSE_LIMIT) state.eventLog.push({
    ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 的${responseName ?? getSkill(skillId)?.name ?? "反伤技能"}本回合响应已达${RETALIATION_RESPONSE_LIMIT}次，本回合不再新增该技能的响应`
  });
  return granted;
}
