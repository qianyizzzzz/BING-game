import { GameState, PlayerId, PlayerState } from "../types";
import { createBaseEvent, findPlayer } from "./gameFactory";

/** Only temporary restrictions belong here; seals, removal, theft and cake loss do not. */
export interface NegativeStatusDefinition {
  id: string;
  name: string;
}

const definitions = new Map<string, NegativeStatusDefinition>();
export const NEGATIVE_STATUS_IMMUNITY_BUFF_ID = "temp_negative_status_immunity";

/** Register future negative-status categories before routing their application through this module. */
export function registerNegativeStatus(definition: NegativeStatusDefinition): void {
  if (!definition.id || definitions.has(definition.id)) {
    throw new Error(`不良状态类别无效或重复：${definition.id}`);
  }
  definitions.set(definition.id, { ...definition });
}

export function getNegativeStatusDefinitions(): NegativeStatusDefinition[] {
  return [...definitions.values()].map((definition) => ({ ...definition }));
}

for (const definition of [
  { id: "frozen", name: "冰冻" },
  { id: "skill_disabled", name: "技能失效" },
  { id: "paralysis", name: "麻痹" }
]) registerNegativeStatus(definition);

export function hasNegativeStatusImmunity(player: PlayerState, turnNumber: number): boolean {
  return player.buffs.some((buff) => buff.id === NEGATIVE_STATUS_IMMUNITY_BUFF_ID &&
    (buff.expiresAtTurn ?? -1) >= turnNumber);
}

/** Guard the entire mutation, including refresh/replacement, so immunity never cleanses an old status. */
export function applyNegativeStatus(
  state: GameState,
  targetId: PlayerId,
  statusId: string,
  apply: (target: PlayerState) => void
): boolean {
  const definition = definitions.get(statusId);
  if (!definition) throw new Error(`尚未注册的不良状态：${statusId}`);
  const target = findPlayer(state, targetId);
  if (!target) return false;
  if (hasNegativeStatusImmunity(target, state.turnNumber)) {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${target.name} 免疫了新增的${definition.name}，已有不良状态保持不变` });
    return false;
  }
  apply(target);
  return true;
}
