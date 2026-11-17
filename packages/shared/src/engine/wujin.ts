import type { BuffState, GameState, PlayerAction, PlayerState, SkillId } from "../types";
import { createBaseEvent, createId, getActiveSkillCount } from "./gameFactory";
import { getActionLabel } from "./attacks";
import { canGainStatus } from "./karmaSong";
import { WUJIN_FREE_MOVE_ID, WUJIN_REBOUND_ID } from "../bigCards/abilities";

/** Only the declared move and its stack count are reusable. No target, modifier, material, or paid source survives. */
export type FreeMove = Pick<Extract<PlayerAction, { type: "attack" }>, "type" | "attackId" | "stacks"> |
  Pick<Extract<PlayerAction, { type: "skill" }>, "type" | "skillId" | "stacks"> |
  Pick<Extract<PlayerAction, { type: "defense" }>, "type" | "defense"> |
  Pick<Extract<PlayerAction, { type: "gain_cake" }>, "type">;

export const WUJIN_REBOUND_COUNT = "wujin_rebound_count";
export const FREE_ABILITY_SOURCE_PREFIX = "free_move:";

export function getFreeMoveTemplate(action: PlayerAction): FreeMove | undefined {
  switch (action.type) {
    case "attack": return { type: action.type, attackId: action.attackId, stacks: action.stacks };
    case "skill": return { type: action.type, skillId: action.skillId, stacks: action.stacks };
    case "defense": return { type: action.type, defense: action.defense };
    case "gain_cake": return { type: action.type };
    case "discard_skill": return undefined;
  }
}

function matchesFreeMove(move: FreeMove, action: FreeMove | PlayerAction): boolean {
  switch (move.type) {
    case "attack": return action.type === "attack" && move.attackId === action.attackId && move.stacks === action.stacks;
    case "skill": return action.type === "skill" && move.skillId === action.skillId && move.stacks === action.stacks;
    case "defense": return action.type === "defense" && move.defense === action.defense;
    case "gain_cake": return action.type === "gain_cake";
  }
}

export function getFreeMoveChoices(player?: Pick<PlayerState, "buffs">): Array<{ id: string; remaining: number; move: FreeMove }> {
  return player?.buffs.flatMap((buff) => buff.freeMove && buff.stacks > 0 ?
    [{ id: buff.id, remaining: buff.stacks, move: buff.freeMove }] : []) ?? [];
}

export function getFreeMoveId(action: PlayerAction): string | undefined {
  return "freeMoveId" in action ? action.freeMoveId : undefined;
}

export function getMatchingFreeMove(player: Pick<PlayerState, "buffs">, action: PlayerAction): BuffState | undefined {
  const id = getFreeMoveId(action);
  return id ? player.buffs.find((buff) => buff.id === id && buff.stacks > 0 &&
    buff.freeMove && matchesFreeMove(buff.freeMove, action)) : undefined;
}

export function grantWujinMove(state: GameState, player: PlayerState | undefined, move: FreeMove | undefined): void {
  if (!player || !move || getActiveSkillCount(player, WUJIN_FREE_MOVE_ID) === 0) return;
  grantFreeMove(state, player, move, 1);
}

export function grantFreeMove(state: GameState, player: PlayerState, move: FreeMove, count: number): void {
  if (!canGainStatus(player)) return;
  if (count <= 0) return;
  const found = player.buffs.find((buff) => buff.freeMove && matchesFreeMove(buff.freeMove, move));
  if (found) found.stacks += count;
  else player.buffs.push({ id: createId("free_move"), name: "免费出招", stacks: count, freeMove: move });
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `${player.name} 获得 ${count} 次免费${getActionLabel(move)}` });
}

export function spendFreeMove(player: PlayerState, action: PlayerAction): void {
  const buff = getMatchingFreeMove(player, action);
  if (!buff) return;
  buff.stacks -= 1;
  if (buff.stacks === 0) player.buffs = player.buffs.filter((entry) => entry !== buff);
}

export function getWujinReboundCount(player?: Pick<PlayerState, "buffs">): number {
  return player?.buffs.find((buff) => buff.id === WUJIN_REBOUND_COUNT)?.stacks ?? 0;
}

export function isNextWujinReboundFree(player?: PlayerState): boolean {
  return getActiveSkillCount(player, WUJIN_REBOUND_ID) > 0 && (getWujinReboundCount(player) + 1) % 4 === 0;
}

export function recordWujinRebound(player: PlayerState): void {
  const counter = player.buffs.find((buff) => buff.id === WUJIN_REBOUND_COUNT);
  if (counter) counter.stacks += 1;
  else player.buffs.push({ id: WUJIN_REBOUND_COUNT, name: "已出反弹", stacks: 1 });
}

export function freeAbilitySourceId(action: { skillId: SkillId; freeMoveId?: string }): string | undefined {
  return action.freeMoveId ? `${FREE_ABILITY_SOURCE_PREFIX}${action.skillId}` : undefined;
}
