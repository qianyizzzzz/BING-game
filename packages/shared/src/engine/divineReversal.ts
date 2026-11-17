import type { AttackStats, BuffState, DefeatLevel, PlayerAction, PlayerActionPlan, PlayerState, SkillId } from "../types";
import { attackPowerValue, combatValue, compareCombatValues, getPointDamageDefeatLevel, INFINITY_VALUE,
  multiplyCombatValues, projectCombatValue, withAttackPower, type CombatValue } from "./combatValues";
import { getActiveSkillCount } from "./gameFactory";
import { getSkill } from "../skills/registry";
import { getOwnedSkillIds } from "../skills/fusion";
import { isSkillIgnorable, type SkillIgnore } from "./skillIgnore";
import { CHEAT_GATHER_ID } from "./cheatServerIds";
import { SHADOW_WIND_DANCE_ID } from "./shadowIds";
import { TIAN_YE_SOARING_ID } from "./tianyeIds";
import { YIYUAN_ETERNAL, YIYUAN_STEP, YIYUAN_GOD } from "./yiyuanIds";
import { DIVINE_BLIND_ID, DIVINE_DOOM_ID, DIVINE_EXIT_ID, DIVINE_EXIT_LOCK, DIVINE_FLAME_ENABLED, DIVINE_FLAME_ID,
  DIVINE_RIFT_ID } from "./divineReversalIds";

export function activeDivineFlame(player: PlayerState | undefined): boolean {
  return Boolean(getActiveSkillCount(player, DIVINE_FLAME_ID) && player?.buffs.some((buff) => buff.id === DIVINE_FLAME_ENABLED && buff.stacks > 0));
}

export function withoutDivineLevel(stats: AttackStats): AttackStats {
  return { ...stats, level: 0, levelValue: [], noClashLevel: true };
}

export function scaleDivineAttack(stats: AttackStats, times: number): AttackStats {
  if (!times || stats.fixedPointPower) return stats;
  const { divineRiftRank: _derived, ...ordinaryStats } = stats;
  if (getPointDamageDefeatLevel(ordinaryStats)) return stats;
  const multiplier = times === 1 ? INFINITY_VALUE : combatValue(1, times);
  const power = multiplyCombatValues(attackPowerValue(stats), multiplier);
  const parts = (stats.damagePartValues ?? stats.damageParts?.map((value) => combatValue(value)))?.map((part, index, list) =>
    stats.honghuangLastRetires && index === list.length - 1 ? part : multiplyCombatValues(part, multiplier));
  return { ...withAttackPower(stats, power), ...(parts ? { damagePartValues: parts, damageParts: parts.map(projectCombatValue) } : {}) };
}

export function shapeDivineSourceAttack(owner: PlayerState | undefined, original: AttackStats): AttackStats {
  if (!owner?.bigCards?.length) return original;
  let stats = getActiveSkillCount(owner, DIVINE_BLIND_ID) ? withoutDivineLevel(original) : original;
  if (stats.nonAttackMove || stats.id === "1035") return stats;
  const flame = activeDivineFlame(owner);
  stats = scaleDivineAttack(stats, getActiveSkillCount(owner, DIVINE_DOOM_ID) + Number(flame));
  return { ...stats, ...(flame ? { divineFlame: true as const } : {}),
    ...(getActiveSkillCount(owner, DIVINE_RIFT_ID) ? { divineRift: true as const, pierceInvulnerability: true } : {}) };
}

export function divineRiftRank(value: CombatValue): 2 | 3 | 4 | undefined {
  if (compareCombatValues(value, combatValue(1, 4)) >= 0) return 4;
  if (compareCombatValues(value, combatValue(1, 3)) >= 0) return 3;
  if (compareCombatValues(value, combatValue(1, 2)) >= 0) return 2;
  return undefined;
}

export function rankDivineAttack(stats: AttackStats): AttackStats {
  if (!stats.divineRift) return stats;
  const { divineRiftRank: _previous, ...base } = stats;
  if (getPointDamageDefeatLevel(base)) return base;
  const rank = divineRiftRank(attackPowerValue(base));
  return rank === undefined ? base : { ...base, divineRiftRank: rank };
}

export function hasDivineExitLock(player: PlayerState, level = player.defeatLevel): boolean {
  return (level ?? 1) >= 2 &&
    (player.buffs.some((buff) => buff.id === DIVINE_EXIT_LOCK) || getActiveSkillCount(player, DIVINE_EXIT_ID) > 0);
}

export function isBlindTargetedMove(move: PlayerAction): boolean {
  return (move.type === "attack" || move.type === "skill") &&
    Boolean(move.targetId || (move.type === "skill" && move.targetIds?.length));
}

export function hasBlindTargetedMove(player: PlayerState | undefined, plan: PlayerActionPlan | undefined): boolean {
  return Boolean(player?.bigCards?.length && getActiveSkillCount(player, DIVINE_BLIND_ID) && plan?.actions.some(isBlindTargetedMove));
}

export function blindSuppressesMoveProtection(player: PlayerState | undefined, plan: PlayerActionPlan | undefined, buff: BuffState,
  turn: number, round: number): boolean {
  if (!buff.sourceAbilityId || !hasBlindTargetedMove(player, plan) ||
    buff.sourcePlayerId && buff.sourcePlayerId !== player?.id) return false;
  if (buff.expiresAtTurn !== turn && buff.expiresAtTurn !== turn + 1 && buff.expiresAtRound !== round + 1 &&
    buff.sourceMoveIndex === undefined) return false;
  return Boolean(plan?.actions.some((move, index) => move.type === "skill" && move.skillId === buff.sourceAbilityId &&
    isBlindTargetedMove(move) && (buff.sourceMoveIndex === undefined || buff.sourceMoveIndex === index)));
}

export function containsInvulnerability(skillId: SkillId | undefined): boolean {
  if (!skillId || skillId === DIVINE_RIFT_ID) return false;
  if ([SHADOW_WIND_DANCE_ID, TIAN_YE_SOARING_ID, CHEAT_GATHER_ID, YIYUAN_ETERNAL, YIYUAN_STEP, YIYUAN_GOD].includes(skillId)) return true;
  const description = getSkill(skillId)?.description ?? "";
  return /(?:^|[，,。；：、\s])(?:此|本)(?:回合|轮)(?:获得)?(?:绝对)?无敌/.test(description) ||
    /每轮前\s*\d+\s*回合(?:绝对)?无敌|判定[^，。；]{0,8}(?:绝对)?无敌/.test(description) ||
    /(?:拥有|获得|进入|变为|给[^，。；]{0,10}赋予)[^，。；]{0,10}(?:绝对)?无敌/.test(description) ||
    /(?:^|[，,。；：、\s])(?:你)?对[^，。；]{1,18}(?:绝对)?无敌/.test(description) ||
    /^(?:[^：]{0,12}：)?(?:锁定技[。；])?(?:绝对)?无敌/.test(description);
}

export function divineInvulnerabilityMask(target: PlayerState, current: SkillIgnore | undefined,
  sourceIds: Iterable<SkillId>): SkillIgnore | undefined {
  if (current && "all" in current) return current;
  const ids = new Set([...getOwnedSkillIds(target).filter(containsInvulnerability), ...sourceIds]);
  if (!ids.size) return current;
  const counts = current && "skillCounts" in current ? { ...current.skillCounts } : {};
  if (current && "skillId" in current) counts[current.skillId] = 1;
  if (current && "fusionSkillIds" in current) for (const id of current.fusionSkillIds) counts[id] = Infinity;
  for (const id of ids) if (isSkillIgnorable(id)) counts[id] = Number.MAX_SAFE_INTEGER;
  return { skillCounts: counts };
}

export function divinePointDamage(level: DefeatLevel): CombatValue {
  return combatValue(1, level - 0.1);
}
