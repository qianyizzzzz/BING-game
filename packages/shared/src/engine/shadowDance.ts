import type { AttackStats, BuffState, GameState, PlayerAction, PlayerState } from "../types";
import { addCombatValues, combatValue, withAttackLevel, withAttackPower } from "./combatValues";
import { findPlayer, getActiveSkillCount } from "./gameFactory";
import { getPlayerHpValue } from "./infiniteValues";
import { canGainStatus } from "./karmaSong";
import {
  SHADOW_BLADE_DANCE_ID, SHADOW_FOLLOW_ID, SHADOW_SHRIEK_ID, SHADOW_STANCE_ID, SHADOW_STANCE_STATE, SHADOW_STOP_SHRIEK_ID
} from "./shadowIds";

export const SHADOW_WOUND_STATE = "shadow_next_damage";
export const SHADOW_ACTION_LOCK = "shadow_shriek_action_lock";

export function enterShadowDance(player: PlayerState, sourceAbilityId = SHADOW_STANCE_ID): void {
  if (!canGainStatus(player)) return;
  player.buffs = player.buffs.filter(({ stateType }) => stateType !== SHADOW_STANCE_STATE);
  player.buffs.push({ id: SHADOW_STANCE_STATE, stateType: SHADOW_STANCE_STATE, name: "影舞",
    stacks: 1, sourceAbilityId, preventsTargetSelection: true });
}

export function leaveShadowDance(player: PlayerState): void {
  player.buffs = player.buffs.filter(({ stateType }) => stateType !== SHADOW_STANCE_STATE);
}

export function prepareShadowRound(player: PlayerState): void {
  if (getActiveSkillCount(player, SHADOW_STANCE_ID)) enterShadowDance(player);
}

export function giveShadowWound(state: GameState, player: PlayerState, moveIndex: number,
  targetId?: string): void {
  if (!canGainStatus(player)) return;
  const sourceAbilityId = targetId ? SHADOW_FOLLOW_ID : SHADOW_BLADE_DANCE_ID;
  const id = SHADOW_WOUND_STATE + ":" + (targetId ?? "any");
  const sourceKey = targetId ? id : id + `:${state.turnNumber}:${moveIndex}`;
  const previousBlade = targetId ? undefined : player.buffs.filter((buff) =>
    buff.stateType === SHADOW_WOUND_STATE && !buff.sourcePlayerId && buff.shadowGrantTurn !== state.turnNumber).at(-1);
  player.buffs = player.buffs.filter((buff) => buff.id !== sourceKey && (targetId ||
    buff.stateType !== SHADOW_WOUND_STATE || buff.sourcePlayerId || buff.shadowGrantTurn === state.turnNumber || buff === previousBlade));
  player.buffs.push({ id: sourceKey, stateType: SHADOW_WOUND_STATE, name: targetId ? "暗色随行·下次伤害×3" : "刃舞·下次伤害×2",
    stacks: 1, sourceAbilityId, ...(targetId ? { sourcePlayerId: targetId } : {}), sourceMoveIndex: moveIndex, shadowGrantTurn: state.turnNumber });
}

export function shadowWoundCharges(state: GameState, player: PlayerState | undefined, targetId: string,
  moveIndex?: number): BuffState[] {
  return (player?.buffs ?? []).filter((buff) => buff.stateType === SHADOW_WOUND_STATE &&
    (!buff.sourcePlayerId || buff.sourcePlayerId === targetId) &&
    !(buff.sourceAbilityId === SHADOW_BLADE_DANCE_ID && moveIndex !== undefined &&
      (buff.sourceMoveIndex ?? -1) >= moveIndex && buff.shadowGrantTurn === state.turnNumber));
}

export function setShadowActionLock(state: GameState, player: PlayerState, sourceId: string): void {
  const previous = player.buffs.find((buff) => buff.stateType === SHADOW_ACTION_LOCK && (buff.expiresAtTurn ?? 0) > state.turnNumber);
  player.buffs = player.buffs.filter((buff) => buff.stateType !== SHADOW_ACTION_LOCK);
  player.buffs.push({ id: SHADOW_ACTION_LOCK, stateType: SHADOW_ACTION_LOCK, name: "风唳·无法出招",
    stacks: 1, sourcePlayerId: sourceId, sourceAbilityId: SHADOW_SHRIEK_ID, expiresAtTurn: state.turnNumber + 3,
    moveBlockedFromTurn: previous ? previous.moveBlockedFromTurn ?? state.turnNumber : state.turnNumber + 1 });
}

export function shapeShadowAttack(state: Pick<GameState, "players">, action: PlayerAction, stats: AttackStats): AttackStats {
  if (action.type !== "skill" || action.skillId !== SHADOW_STOP_SHRIEK_ID) return stats;
  const target = action.targetId ? findPlayer(state, action.targetId) : undefined;
  if (!target) return stats;
  const power = addCombatValues(getPlayerHpValue(target), combatValue(1));
  return withAttackLevel(withAttackPower(stats, power), power);
}
