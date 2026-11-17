import { ANNIHILATION_CANNON_ID, DRAGON_BLOOD_FIELD_ID } from "../bigCards/abilities";
import { getDragonBloodMode, getDragonBloodTotal } from "./starDragon";
import type { PendingDamageItem, GameState, PlayerAction, PlayerId, SkillAction } from "../types";
import { getSkillPlay } from "../skills/registry";
import { BASE_ATTACKS } from "./attacks";
import { compareCombatValues, RETIRE_VALUE } from "./combatValues";
import { pendingDamageValue } from "./damageKinds";
import { getFusionSkillId, isHigherFusionAreaAttack } from "../skills/fusion";
import type { PlayerState } from "../types";
import { houndBiteIsArea } from "./beast";
import { HOUND_SUMMON_ID } from "./beastTraits";
import { preventsTargetSelection } from "./spaces";
import { BUBBLE_FINALE } from "./bubbleDreamIds";

export function getJunengTargetLock(state: Pick<GameState, "junengTargetLock" | "roundNumber" | "smallSpaces">, spaceId?: string): GameState["junengTargetLock"] {
  const lock = spaceId ? state.smallSpaces?.[spaceId]?.targetLock : state.junengTargetLock;
  return lock && lock.expiresAtRound > state.roundNumber ? lock : undefined;
}

export function clearJunengTargetLock(state: GameState, spaceId?: string): void {
  if (!spaceId) {
    delete state.junengTargetLock;
    return;
  }
  const space = state.smallSpaces?.[spaceId];
  if (space) delete space.targetLock;
}

export function getSelectableJunengTarget(state: Pick<GameState, "junengTargetLock" | "roundNumber" | "players" | "smallSpaces">, spaceId?: string): PlayerId | undefined {
  const lock = getJunengTargetLock(state, spaceId);
  if (!lock) return undefined;
  const target = state.players.find((player) => player.id === lock.targetId);
  return target?.status === "alive" && target.spaceId === spaceId && target.kind !== "spectator" &&
    !preventsTargetSelection(target) ? target.id : undefined;
}

export function applyJunengTargetLock<T extends PlayerAction>(state: GameState, action: T, spaceId?: string, owner?: PlayerState): T | undefined {
  if (action.type === "skill" && action.skillId === BUBBLE_FINALE) return action;
  if (!getJunengTargetLock(state, spaceId)) return action;
  const targetId = getSelectableJunengTarget(state, spaceId);
  if (action.type === "attack" && !BASE_ATTACKS[action.attackId]?.isArea ||
      action.type === "defense" && action.defense === "rebound" && action.targetId) {
    return targetId ? { ...action, targetId } : undefined;
  }
  if (action.type !== "skill") return action;
  if (action.skillId === HOUND_SUMMON_ID && houndBiteIsArea(owner)) return action;
  if (action.skillId === DRAGON_BLOOD_FIELD_ID && owner) {
    const mode = getDragonBloodMode(getDragonBloodTotal(state, owner.id));
    if (mode !== "single") return action;
    return targetId ? { ...action, targetId, targetIds: [targetId] } : undefined;
  }
  if (isHigherFusionAreaAttack(owner, action.skillId)) return action;
  const play = getSkillPlay(action.skillId);
  const switchToAction = action.switchToAction && applyJunengTargetLock(state, action.switchToAction, spaceId, owner);
  if (action.switchToAction && !switchToAction) return undefined;
  const targeted = play?.targetMode === "single" || Boolean(play?.selectedTargetCount) ||
    action.skillId === getFusionSkillId("魔域") ||
    Boolean(action.targetId || action.targetIds?.length);
  if (!targeted) return switchToAction ? { ...action, switchToAction } : action;
  if (!targetId) return undefined;
  return { ...action, ...(switchToAction ? { switchToAction } : {}),
    targetId, ...(play?.selectedTargetCount || play?.optionalTargetCount || action.targetIds?.length ||
      action.skillId === getFusionSkillId("魔域") ? { targetIds: [targetId] } : {}) };
}

export function isStorableJunengDamage(item: PendingDamageItem): boolean {
  return !item.defensePiercing && !item.directDefeat && !item.unprocessedSpell && item.amount > 0 && (item.pointDefeatLevel === 2 || item.pointDefeatLevel === undefined &&
    compareCombatValues(pendingDamageValue(item), RETIRE_VALUE) <= 0);
}

export function isCannonAttack(action: PlayerAction): action is SkillAction {
  return action.type === "skill" && action.skillId === ANNIHILATION_CANNON_ID;
}
