import type { GameState, PlayerAction, PlayerState } from "../types";
import { HUIYUE_BUFF_ID, isHuiyueActive } from "../skills/fusion";
import { hasPig } from "./beastTraits";
import { DEMON_LEGION_LOCK } from "./demonIds";
import { negativeStatusesHaveNoEffect } from "./effectCategories";
import { MOON_SHADOW_LOCK } from "./moonCombat";
import { SHADOW_ACTION_LOCK } from "./shadowDance";
import { isInYuanVoidSpace, isSoulExiled } from "./spaces";
import { SPACE_BURST_SPACE } from "./spaceTimeIds";
import { SEVEN_STAR_MOVE_LOCK } from "./sevenStarIds";

export const PARALYSIS_NEXT_ACTION_BUFF_PREFIX = "paralysis_next_action:";
export const PARALYSIS_CURRENT_ACTION_BUFF_PREFIX = "paralysis_current_action:";

export function parseParalysisFixedMove(value: string): PlayerAction | undefined {
  if (value === "gain_cake") return { type: "gain_cake" };
  if (value === "small" || value === "youtiao" || value === "stone") return { type: "defense", defense: value };
}

export function getParalysisFixedMove(
  state: Pick<GameState, "turnNumber">,
  player: Pick<PlayerState, "buffs" | "bigCards"> | undefined
): PlayerAction | undefined {
  if (!player || negativeStatusesHaveNoEffect(player)) return;
  const current = player.buffs.find((buff) => buff.id.startsWith(PARALYSIS_CURRENT_ACTION_BUFF_PREFIX) &&
    buff.expiresAtTurn === state.turnNumber);
  if (current) return parseParalysisFixedMove(current.id.slice(PARALYSIS_CURRENT_ACTION_BUFF_PREFIX.length));
}

const timedMoveLocks = [
  { stateType: DEMON_LEGION_LOCK, reason: "军团打击生效期间不能出招" },
  { stateType: SHADOW_ACTION_LOCK, reason: "风唳生效期间不能出招" },
  { stateType: MOON_SHADOW_LOCK, reason: "月影生效期间不能出招" }
];

// Check the effective actor of the move, including after a source change. Phase
// skills and the later effects of moves that already fired use their own rules.
export function getMoveBlockReason(
  state: Pick<GameState, "smallSpaces" | "turnNumber" | "roundNumber">,
  player: Pick<PlayerState, "spaceId" | "buffs" | "bigCards"> | undefined
): string | undefined {
  if (!player) return;
  const { turnNumber, roundNumber } = state;
  if (isSoulExiled(state, player)) return "流放地内不能出招";
  if (isInYuanVoidSpace(state, player)) return "虚元异空间内不能出招";
  if (player.spaceId && state.smallSpaces?.[player.spaceId]?.kind === SPACE_BURST_SPACE) return "空间爆破的小空间内不能出招";
  if (hasPig(player)) return "猪不能出招";
  if (player.buffs.some((buff) => buff.stateType === SEVEN_STAR_MOVE_LOCK && buff.stacks > 0 &&
    (buff.moveBlockedFromTurn ?? Infinity) <= turnNumber && (buff.expiresAtTurn ?? 0) > turnNumber)) return "天权生效期间不能出招";
  if (isHuiyueActive(player, turnNumber) && !player.buffs.some((buff) =>
    buff.id === HUIYUE_BUFF_ID && buff.huiyueAllowsMoves && (buff.expiresAtTurn ?? 0) >= turnNumber)) return "辉月生效期间不能出招";
  if (negativeStatusesHaveNoEffect(player)) return;

  const active = player.buffs.filter((buff) => (buff.moveBlockedFromTurn ?? -Infinity) <= turnNumber &&
    (buff.expiresAtRound ?? Infinity) > roundNumber);
  if (active.some((buff) => (buff.stateType === "sleep" || buff.id === "sleep") && buff.stacks > 0 &&
    (buff.expiresAtTurn ?? Infinity) > turnNumber)) return "睡眠期间不能出招";
  if (active.some((buff) => buff.id === "frozen" && (buff.expiresAtTurn ?? Infinity) >= turnNumber))
    return "冰冻期间不能出招";
  if (active.some((buff) => buff.stateType === "stunned" && (buff.expiresAtTurn ?? Infinity) > turnNumber))
    return "眩晕期间不能出招";
  const timedLock = timedMoveLocks.find(({ stateType }) => active.some((buff) => buff.stateType === stateType &&
    (buff.expiresAtTurn ?? 0) > turnNumber));
  if (timedLock) return timedLock.reason;
  if (active.some((buff) => (buff.id === `${PARALYSIS_CURRENT_ACTION_BUFF_PREFIX}none` && buff.expiresAtTurn === turnNumber) ||
    (buff.id === `${PARALYSIS_NEXT_ACTION_BUFF_PREFIX}none` && buff.stacks > 0))) return "麻痹期间不能出招";
}
