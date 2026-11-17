import {
  AttackStats, BuffState, DefeatLevel, GameState, PlayerAction, PlayerId, PlayerState, SkillId, SkillTimingPhase
} from "../types";
import {
  CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID, HUNYAO_AREA_ID, HUNYAO_RESET_ID, HUNYAO_LIGHT_ID,
  RI_SKILL_ID
} from "../bigCards/abilities";
import { alivePlayers, createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { getActiveFusionCount } from "../skills/fusion";
import { changeCakes } from "./cakeResources";
import { combatValue, scaleCombatValue, withAttackPower } from "./combatValues";
import type { CombatValue } from "./combatValues";
import { canAffectAcrossSpace } from "./spaces";
import { canRestoreWithInitialHpCap, hasInitialPlayerSnapshot, restorePlayerInitialState } from "./initialPlayerState";
import { canRestoreTemporalState } from "./jueying";
import { discountCakeCost } from "./actionCosts";
import { finishSoulDeathIgnores, soulDeathIgnoresSkill } from "./soulPact";
import { isSkillIgnored } from "./skillIgnore";
import { hasRevivalRestrictionFlag, ignoresRevivalRestrictions } from "./siphon";
import { PURPLE_REVIVAL_BLOCK } from "./purpleEye";
import { FALLEN_SPLENDOR_REBIRTH_STAGES } from "./fallenSplendorIds";
import { SEA_GOD_REVIVAL_BLOCK } from "./seaGodIgnore";
import { isCorrupted } from "./corruptionIds";
import { CURTAIN_RECOVERY_BLOCK } from "./curtainIds";
import { hasDivineExitLock } from "./divineReversal";
import { canRecoverWithHpCap } from "./infiniteValues";

export const HUNYAO_QUEUED_SHA = "pending_hunyao_sha";
const ELECTRIC_SHOCK_SKILL_ID = "1035";
const THREE_SOULS = new Set(["1051302", "1061903", "1081102"]);
type ContinuationKind = NonNullable<BuffState["continuationBlocks"]>[number];

const RI_USE_COUNT = `skill_used:${RI_SKILL_ID}`;

export function countRiStacks(actions: readonly PlayerAction[]): number {
  return actions.reduce((sum, action) => sum + (action.type === "skill" && action.skillId === RI_SKILL_ID ? action.stacks : 0), 0);
}

export function recordRiStacks(player: PlayerState, stacks: number): void {
  if (stacks <= 0) return;
  const count = player.buffs.find((buff) => buff.id === RI_USE_COUNT);
  if (count) count.stacks += stacks;
  else player.buffs.push({ id: RI_USE_COUNT, name: "日累计重数", stacks });
}

export function applyHunyaoRiStats(player: PlayerState | undefined, stats: AttackStats, priorRiStacks = 0): AttackStats {
  if (stats.id !== RI_SKILL_ID || !player) return stats;
  const hunyao = getActiveSkillCount(player, HUNYAO_LIGHT_ID) > 0;
  if (hunyao) stats = { ...stats, level: 4 * stats.stacks, levelValue: combatValue(4 * stats.stacks), isArea: true,
    traits: Array.from(new Set([...stats.traits, "area"])) };
  if (!getActiveFusionCount(player, "破晓")) return hunyao ? withAttackPower(stats, combatValue(4 * stats.stacks)) : stats;

  const used = (player.buffs.find((buff) => buff.id === RI_USE_COUNT)?.stacks ?? 0) + priorRiStacks;
  const first = used + (hunyao ? 4 : 1);
  const total = stats.stacks * (2 * first + stats.stacks - 1) / 2;
  return withAttackPower(stats, combatValue(total));
}

export function isHunyaoAreaAttack(stats: AttackStats): boolean {
  return stats.isArea && !stats.nonAttackMove && stats.id !== ELECTRIC_SHOCK_SKILL_ID;
}

export function getHunyaoExpandedTargets(
  state: Pick<GameState, "players">, sourceId: PlayerId, stats: AttackStats, targets: PlayerId[]
): PlayerId[] | undefined {
  if (stats.isArea || stats.id === ELECTRIC_SHOCK_SKILL_ID ||
    (stats.targetSkillIgnore && "all" in stats.targetSkillIgnore)) return undefined;
  if (!targets.some((targetId) => {
    const target = findPlayer(state, targetId);
    return targetId !== sourceId && canAffectAcrossSpace(state, sourceId, targetId) &&
      target?.status === "alive" && getActiveSkillCount(target, HUNYAO_AREA_ID) > 0;
  })) return undefined;
  return alivePlayers(state).filter((player) => player.id !== sourceId && canAffectAcrossSpace(state, sourceId, player.id)).map((player) => player.id);
}

export function multiplyHunyaoAreaLevel(player: PlayerState | undefined, level: CombatValue): CombatValue {
  return getActiveSkillCount(player, HUNYAO_AREA_ID) ? scaleCombatValue(level, 3) : level;
}

export function canQueueAttackInWindow(phase: SkillTimingPhase): boolean {
  return phase === "turn_before_action" || phase === "turn_change_action";
}

export function getHunyaoPursuitTargets<T extends Pick<GameState, "players">>(
  state: T, skillId: SkillId
): PlayerState[] {
  return state.players.filter((target) => {
    if (target.status !== "dead" || !canRecoverWithHpCap(target) || isCorrupted(target) || target.kind === "spectator" || target.emptyCityBodyDefeatId || target.emptyCityPhantomDefeat ||
      hasDivineExitLock(target)) return false;
    const level = target.defeatLevel;
    if (skillId === CHASE_LIGHT_ID) {
      return level === 1 && !hasRevivalRestrictionFlag(target);
    }
    if (skillId === CHASE_SHADOW_ID) return level === 2;
    return skillId === CHASE_SOUL_ID && level !== undefined && level < 4;
  });
}

/** Pending big cards can register their restrictions here when those abilities are implemented. */
export function hasContinuationBlock(
  state: GameState, target: PlayerState, kind: ContinuationKind, bypass: "none" | "three_souls" | "all"
): boolean {
  const canRecover = kind === "initial_reset" ? canRestoreWithInitialHpCap(state, target) : canRecoverWithHpCap(target);
  if (!canRecover && (kind !== "initial_reset" || target.status !== "alive" ||
    target.buffs.some(({ id }) => id === "pending_death" || id === "direct_non_damage_death"))) return true;
  if (isCorrupted(target) || target.buffs.some((buff) => buff.id === CURTAIN_RECOVERY_BLOCK || kind === "revival" &&
    (buff.id === PURPLE_REVIVAL_BLOCK || buff.id === SEA_GOD_REVIVAL_BLOCK))) return true;
  if (hasDivineExitLock(target)) return true;
  if (bypass === "all") return false;
  if (kind === "revival" && (ignoresRevivalRestrictions(target) || getActiveSkillCount(target, FALLEN_SPLENDOR_REBIRTH_STAGES[0]))) return false;
  if (kind === "revival" && hasRevivalRestrictionFlag(target)) return true;
  return target.buffs.some((buff) => buff.continuationBlocks?.includes(kind) &&
    !(buff.sourceAbilityId && (isSkillIgnored(target, buff.sourceAbilityId) || soulDeathIgnoresSkill(target, target.id, buff.sourceAbilityId))) &&
    !(bypass === "three_souls" && buff.sourceAbilityId && THREE_SOULS.has(buff.sourceAbilityId))) ||
    state.players.some((owner) => owner.status === "alive" && owner.id !== target.id && canAffectAcrossSpace(state, owner.id, target.id) &&
      owner.buffs.some((buff) => buff.sourcePlayerId === owner.id && buff.continuationBlocks?.includes(kind) &&
        !(buff.sourceAbilityId && (isSkillIgnored(owner, buff.sourceAbilityId) || soulDeathIgnoresSkill(target, owner.id, buff.sourceAbilityId))) &&
        !(bypass === "three_souls" && buff.sourceAbilityId && THREE_SOULS.has(buff.sourceAbilityId))));
}

export function restoreHunyaoInitialState(state: GameState, player: PlayerState, defeatLevel: DefeatLevel): boolean {
  if (defeatLevel >= 4 || hasDivineExitLock(player, defeatLevel) || !hasInitialPlayerSnapshot(state, player.id) || (player.actionCakes ?? 0) < 10 ||
    !getActiveSkillCount(player, HUNYAO_RESET_ID) || hasContinuationBlock(state, player, "initial_reset", "none") ||
    !canRestoreTemporalState(state, player)) return false;

  const cost = discountCakeCost(state, player, 10);
  finishSoulDeathIgnores(state, player);
  changeCakes(state, player.id, player.cakes - cost, "魂耀九州消耗出饼积累", { actionCakeDelta: -cost });
  restorePlayerInitialState(state, player);
  const keepsPursuits = [CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID].some((id) => getActiveSkillCount(player, id) > 0);
  if (keepsPursuits) player.hunyaoAwakened = true;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 触发魂耀九州，恢复至初始${keepsPursuits ? "，三追概率提升至100%" : ""}` });
  return true;
}
