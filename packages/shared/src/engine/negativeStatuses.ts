import { GameState, INFINITE_DAMAGE, PlayerId, PlayerState } from "../types";
import { createBaseEvent, findPlayer } from "./gameFactory";
import { ignoresNegativeStatuses, registerStateDefinition } from "./effectCategories";
import { getActiveFusionCount } from "../skills/fusion";

/** Applied restrictions belong here, including persistent marks consumed on a later trigger. */
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
  registerStateDefinition({ ...definition, categories: ["negative"] });
}

export function getNegativeStatusDefinitions(): NegativeStatusDefinition[] {
  return [...definitions.values()].map((definition) => ({ ...definition }));
}

for (const definition of [
  { id: "frozen", name: "冰冻" },
  { id: "skill_disabled", name: "技能失效" },
  { id: "paralysis", name: "麻痹" },
  { id: "burning", name: "烧伤" },
  { id: "limited_disabled", name: "限定技失效" },
  { id: "control_disabled", name: "控制技失效" },
  { id: "mitigation_disabled", name: "减伤与回避失效" },
  { id: "fenjin", name: "焚烬" },
  { id: "star_group_attack_disabled", name: "群攻技能攻击失效" },
  { id: "temporary_skill_absorption", name: "暂时吸取技能" }
]) registerNegativeStatus(definition);

export function hasNegativeStatusImmunity(player: PlayerState, turnNumber: number): boolean {
  return ignoresNegativeStatuses(player) || getActiveFusionCount(player, "天人合一") > 0 || player.buffs.some((buff) =>
    buff.id === NEGATIVE_STATUS_IMMUNITY_BUFF_ID && (buff.expiresAtTurn ?? -1) >= turnNumber);
}

/** Guard the entire mutation, including refresh/replacement, so immunity never cleanses an old status. */
export function applyNegativeStatus(
  state: GameState,
  targetId: PlayerId,
  statusId: string,
  apply: (target: PlayerState) => void,
  sourceId?: PlayerId
): boolean {
  const definition = definitions.get(statusId);
  if (!definition) throw new Error(`尚未注册的不良状态：${statusId}`);
  const target = findPlayer(state, targetId);
  if (!target) return false;
  if (hasNegativeStatusImmunity(target, state.turnNumber) || (sourceId && target.buffs.some((buff) =>
    buff.stateType === "star_negative_guard" && buff.sourcePlayerId === sourceId && (buff.expiresAtRound ?? 0) > state.roundNumber))) {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${target.name} 免疫了新增的${definition.name}，已有不良状态保持不变` });
    return false;
  }
  apply(target);
  return true;
}

export function applyFrozenStatus(state: GameState, targetId: PlayerId, duration: number, unit: "turn" | "round", sourceId?: PlayerId): boolean {
  return applyNegativeStatus(state, targetId, "frozen", (target) => {
    if (target.buffs.some((buff) => buff.id === "frozen" && buff.infinite)) return;
    if (duration >= INFINITE_DAMAGE) {
      target.buffs = target.buffs.filter((buff) => buff.id !== "frozen");
      target.buffs.push({ id: "frozen", name: "冰冻", stacks: INFINITE_DAMAGE, infinite: true });
      return;
    }
    const boundary = unit === "turn" ? "expiresAtTurn" : "expiresAtRound";
    const expiry = (unit === "turn" ? state.turnNumber : state.roundNumber) + duration;
    const existing = target.buffs.find((buff) => buff.id === "frozen" && buff[boundary] !== undefined);
    if (existing) {
      existing.stacks = Math.max(existing.stacks, duration);
      existing[boundary] = Math.max(existing[boundary] ?? 0, expiry);
    } else {
      target.buffs.push({ id: "frozen", name: "冰冻", stacks: duration, [boundary]: expiry });
    }
  }, sourceId);
}
