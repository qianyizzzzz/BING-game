import {
  AttackStats, AttackStatModifierChoice, GameState, PublicGameState, PlayerId, PlayerState,
  PlayerAction, INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER,
  EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER
} from "../types";
import { BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import { getActiveSkillCount, playerHasActiveSkill } from "./gameFactory";
import { applyAttackModifiers, getSkillAttackStats, getSkillCakeCostKind } from "../skills/registry";
import { getAttackActionCost, getTurnSkillActionCost } from "./actionCosts";
import { getEnhancedChildFusionIds, getFusionEnhancementCount, getFusionRecipe, getFusionSkillId } from "../skills/fusion";
import { HUNYAO_AREA_ID } from "../bigCards/abilities";
import { getHunyaoExpandedTargets, multiplyHunyaoAreaLevel } from "./hunyao";
import { shapeDragonBloodAttack } from "./starDragon";
import { addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues,
  fromLegacyCombatStat, getPointDamageTrait, INFINITY_VALUE, isUnboundedCombatValue, multiplyCombatValues, offsetAttackStats,
  projectCombatValue, scaleCombatValue, withAttackLevel, withAttackPower } from "./combatValues";
import type { CombatValue } from "./combatValues";

export const ATTACK_STAT_MODIFIER_BUFF_PREFIX = "pending_attack_stat_modifier:";
export const ENHANCED_LEVEL_SWAP_MODIFIERS: AttackStatModifierChoice[] = [
  "swap_power_level", "swap_cost_power", "swap_cost_level",
  "rotate_cost_power_level", "rotate_cost_level_power"
];
export const DESTRUCTION_STAT_MODIFIERS: AttackStatModifierChoice[] = [
  "power_plus_1_level_minus_1", "power_minus_1_level_plus_1",
  "power_plus_2_level_minus_2", "power_minus_2_level_plus_2",
  "power_times_3_level_to_zero", "power_to_zero_level_times_4"
];
const DESTRUCTION_SOUL_MODIFIERS: AttackStatModifierChoice[] = [
  "power_plus_2_level_minus_1", "power_minus_1_level_plus_2",
  "power_plus_4_level_minus_2", "power_minus_2_level_plus_4",
  "power_times_6_level_to_zero", "power_to_zero_level_times_8"
];
const INFINITE_DESTRUCTION_MODIFIERS: AttackStatModifierChoice[] = ["power_times_infinity", "level_times_infinity"];

export function getDestructionModifiers(player?: PlayerState): AttackStatModifierChoice[] {
  const skillId = "skill_45_30424";
  const base = player && getFusionEnhancementCount(player, skillId, ["毁灭之魂"]) > 0
    ? DESTRUCTION_SOUL_MODIFIERS : DESTRUCTION_STAT_MODIFIERS;
  const enhanced = player && getEnhancedChildFusionIds(player, "无限之力", getFusionSkillId("宗师之力")).size > 0;
  return enhanced ? [...base, ...INFINITE_DESTRUCTION_MODIFIERS] : base;
}

export function hasEnhancedLevelSwap(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions"> | undefined): boolean {
  return Boolean(player && getFusionEnhancementCount(player, "skill_91_89631", ["杀级换"]) > 0);
}

export function actionHasCakeCost(action: PlayerAction, player?: PlayerState): boolean {
  return action.type === "attack" || (action.type === "skill" && getSkillCakeCostKind(action.skillId, player) !== "none");
}

export function getLevelSwapModifiers(player: PlayerState | undefined, action: PlayerAction): AttackStatModifierChoice[] {
  return hasEnhancedLevelSwap(player) && actionHasCakeCost(action, player)
    ? [...ENHANCED_LEVEL_SWAP_MODIFIERS] : ["swap_power_level"];
}

export function isAttackStatModifierChoice(value: string | undefined): value is AttackStatModifierChoice {
  return [...ENHANCED_LEVEL_SWAP_MODIFIERS, ...DESTRUCTION_STAT_MODIFIERS, ...DESTRUCTION_SOUL_MODIFIERS,
    ...INFINITE_DESTRUCTION_MODIFIERS].includes(value as AttackStatModifierChoice);
}

export function attackStatModifierLabel(modifier: AttackStatModifierChoice): string {
  const labels: Record<AttackStatModifierChoice, string> = {
    swap_power_level: "攻击与等级交换", swap_cost_power: "耗饼与攻击交换", swap_cost_level: "耗饼与等级交换",
    rotate_cost_power_level: "耗饼→等级，攻击→耗饼，等级→攻击",
    rotate_cost_level_power: "耗饼→攻击，攻击→等级，等级→耗饼",
    power_plus_1_level_minus_1: "攻击+1，等级-1", power_minus_1_level_plus_1: "攻击-1，等级+1",
    power_plus_2_level_minus_2: "攻击+2，等级-2", power_minus_2_level_plus_2: "攻击-2，等级+2",
    power_times_3_level_to_zero: "攻击×3，等级变为0", power_to_zero_level_times_4: "攻击变为0，等级×4",
    power_plus_2_level_minus_1: "攻击+2，等级-1", power_minus_1_level_plus_2: "攻击-1，等级+2",
    power_plus_4_level_minus_2: "攻击+4，等级-2", power_minus_2_level_plus_4: "攻击-2，等级+4",
    power_times_6_level_to_zero: "攻击×6，等级变为0", power_to_zero_level_times_8: "攻击变为0，等级×8",
    power_times_infinity: "攻击×无限", level_times_infinity: "等级×无限"
  };
  return labels[modifier];
}

export function payableAttackCost(value: number): number {
  return Math.max(0, Math.min(INFINITE_DAMAGE, value));
}

export function applyAttackStatModifierChoice(stats: AttackStats, modifier: AttackStatModifierChoice): AttackStats {
  const cost = stats.costValue ?? combatValue(stats.cost);
  const power = attackPowerValue(stats), level = attackLevelValue(stats);
  let nextCost = cost, nextLevel = level;
  let changePower: (value: CombatValue) => CombatValue = value => value;
  let replacePower: CombatValue | undefined;
  const offset = (delta: number) => (value: CombatValue) => addCombatValues(value, combatValue(delta));
  switch (modifier) {
    case "swap_power_level": replacePower = level; nextLevel = power; break;
    case "swap_cost_power": replacePower = cost; nextCost = power; break;
    case "swap_cost_level": nextCost = level; nextLevel = cost; break;
    case "rotate_cost_power_level": replacePower = level; nextCost = power; nextLevel = cost; break;
    case "rotate_cost_level_power": replacePower = cost; nextCost = level; nextLevel = power; break;
    case "power_plus_1_level_minus_1": changePower = offset(1); nextLevel = offset(-1)(level); break;
    case "power_minus_1_level_plus_1": changePower = offset(-1); nextLevel = offset(1)(level); break;
    case "power_plus_2_level_minus_2": changePower = offset(2); nextLevel = offset(-2)(level); break;
    case "power_minus_2_level_plus_2": changePower = offset(-2); nextLevel = offset(2)(level); break;
    case "power_times_3_level_to_zero": changePower = value => scaleCombatValue(value, 3); nextLevel = []; break;
    case "power_to_zero_level_times_4": changePower = () => []; nextLevel = scaleCombatValue(level, 4); break;
    case "power_plus_2_level_minus_1": changePower = offset(2); nextLevel = offset(-1)(level); break;
    case "power_minus_1_level_plus_2": changePower = offset(-1); nextLevel = offset(2)(level); break;
    case "power_plus_4_level_minus_2": changePower = offset(4); nextLevel = offset(-2)(level); break;
    case "power_minus_2_level_plus_4": changePower = offset(-2); nextLevel = offset(4)(level); break;
    case "power_times_6_level_to_zero": changePower = value => scaleCombatValue(value, 6); nextLevel = []; break;
    case "power_to_zero_level_times_8": changePower = () => []; nextLevel = scaleCombatValue(level, 8); break;
    case "power_times_infinity": changePower = value => multiplyCombatValues(value, INFINITY_VALUE); break;
    case "level_times_infinity": nextLevel = multiplyCombatValues(level, INFINITY_VALUE); break;
  }
  const nextPower = replacePower ?? changePower(power);
  const result = withAttackLevel(withAttackPower(stats, nextPower), nextLevel);
  result.costValue = nextCost;
  result.cost = isUnboundedCombatValue(nextCost) && compareCombatValues(nextCost, []) > 0
    ? INFINITE_DAMAGE : projectCombatValue(nextCost);
  if (stats.damageParts) {
    result.damagePartValues = stats.damageParts.map((part, index) => index === 0 ? nextPower :
      changePower(stats.damagePartValues?.[index] ?? combatValue(part)));
    result.damageParts = result.damagePartValues.map(projectCombatValue);
  }
  const originalDefeatTrait = stats.traits.find(trait => trait.startsWith("defeat_")) ??
    (stats.powerValue === undefined ? getPointDamageTrait(power) : undefined);
  const nextDefeatTrait = replacePower !== undefined ? getPointDamageTrait(nextPower) :
    compareCombatValues(nextPower, []) > 0 ? originalDefeatTrait : undefined;
  result.traits = stats.traits.filter(trait => !trait.startsWith("defeat_"));
  if (nextDefeatTrait) result.traits.push(nextDefeatTrait);
  return result;
}

export interface AttackStatOperation {
  id: string;
  actionIndex: number;
  modifier: AttackStatModifierChoice;
  enhanced: boolean;
  ignoreEarthBreak?: boolean;
}

export function parseAttackStatOperation(player: PlayerState, buff: PlayerState["buffs"][number]): AttackStatOperation | undefined {
  if (!buff.id.startsWith(ATTACK_STAT_MODIFIER_BUFF_PREFIX)) return undefined;
  const [index, modifier] = buff.id.slice(ATTACK_STAT_MODIFIER_BUFF_PREFIX.length).split(":");
  if (!Number.isInteger(Number(index)) || Number(index) < 0 || !isAttackStatModifierChoice(modifier)) return undefined;
  const sourceFusion = player.skillFusions?.find((fusion) => fusion.id === buff.sourceFusionId);
  const name = sourceFusion && getFusionRecipe(sourceFusion.skillId)?.skill.name;
  return { id: buff.id, actionIndex: Number(index), modifier, enhanced: name === "杀级换",
    ignoreEarthBreak: name === "宗师之力" };
}

export interface PlayerAttackStatPreview {
  stats: Record<number, AttackStats>;
  costs: number[];
  originalCosts: number[];
  changedActionIndices: number[];
  failures: Array<{ id: string; actionIndex: number; error: string }>;
}

/** Same pure preview is used by validation, the controls and final hit settlement. */
export function previewPlayerAttackStats(
  input: GameState | PublicGameState, playerId: PlayerId, candidate?: AttackStatOperation
): PlayerAttackStatPreview {
  const state = structuredClone(input) as GameState;
  const publicState = input as PublicGameState;
  state.pendingActions ??= structuredClone(publicState.revealedActions ?? {});
  state.turnActionCosts ??= structuredClone(publicState.revealedActionCosts ?? {});
  const player = state.players.find((entry) => entry.id === playerId);
  const actions = state.pendingActions[playerId]?.actions ?? [];
  const result: PlayerAttackStatPreview = { stats: {}, costs: [], originalCosts: [], changedActionIndices: [], failures: [] };
  if (!player) return result;
  result.originalCosts = actions.map((action, index) => state.turnActionCosts?.[playerId]?.[index] ??
    (action.type === "attack" ? getAttackActionCost(state, player, action) : action.type === "skill" ? getTurnSkillActionCost(player, action) : 0));
  result.costs = [...result.originalCosts];
  const cached = state.turnAttackStats?.[playerId];
  if (cached && !candidate) {
    result.stats = structuredClone(cached);
    return result;
  }
  for (const [index, action] of actions.entries()) {
    let base = action.type === "attack" ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks) :
      action.type === "skill" ? getSkillAttackStats(action.skillId, action.stacks) : undefined;
    if (base) base = shapeDragonBloodAttack(state, playerId, action, base);
    if (!base) continue;
    let stats = applyAttackModifiers(state, playerId, base, index);
    if (getActiveSkillCount(player, HUNYAO_AREA_ID) && stats.id !== "skill_36_14343") {
      const prefix = `absolute_guard:${index}:`;
      const [guardMode, guardId] = player.buffs.find((buff) => buff.id.startsWith(prefix))?.id.slice(prefix.length).split(":") ?? [];
      const forcedArea = playerHasActiveSkill(player, "skill_54_99719") || playerHasActiveSkill(player, "skill_98_7182");
      const area = guardMode === "single_to_area" || (!guardMode && (stats.isArea || forcedArea));
      const targets = guardMode === "area_to_self" && guardId ? [guardId] :
        action.type === "skill" ? [action.targetId, ...(action.targetIds ?? [])] :
        action.type === "attack" ? [action.targetId] : [];
      const expanded = guardMode !== "area_to_sky" && getHunyaoExpandedTargets(state, playerId,
        { ...stats, isArea: area }, targets.filter((id): id is string => Boolean(id)));
      if (area || expanded) stats = withAttackLevel(stats, multiplyHunyaoAreaLevel(player, attackLevelValue(stats)));
    }
    const specialPower = stats.traits.includes("defeat_explode") ? EXPLODE_EFFECT_POWER :
      stats.traits.includes("defeat_execute") ? EXECUTE_EFFECT_POWER : stats.traits.includes("defeat_vanish") ? VANISH_EFFECT_POWER :
      stats.traits.includes("defeat_retire") ? RETIRE_EFFECT_POWER : 0;
    if (specialPower && !isUnboundedCombatValue(attackPowerValue(stats))) stats = withAttackPower(stats, fromLegacyCombatStat(specialPower));
    stats = { ...stats, cost: result.originalCosts[index]!, costValue: combatValue(result.originalCosts[index]!) };
    result.stats[index] = stats;
  }
  if (!("pendingActions" in input) && publicState.viewerPlayerId !== playerId && publicState.revealedAttackStats?.[playerId]) {
    for (const [index, numbers] of Object.entries(publicState.revealedAttackStats[playerId]!)) {
      if (result.stats[Number(index)]) result.stats[Number(index)] = { ...result.stats[Number(index)]!, ...numbers };
    }
    return result;
  }
  const available = player.cakes + result.originalCosts.reduce((sum, cost) => sum + cost, 0);
  const crystals = getActiveSkillCount(player, "skill_33_55159") +
    getFusionEnhancementCount(player, "skill_33_55159", ["神域之种", "神界炼魂"]);
  const finalLevelMode = new Set<number>();
  const operations = player.buffs.map((buff) => parseAttackStatOperation(player, buff)).filter((op): op is AttackStatOperation => Boolean(op));
  if (candidate) operations.push(candidate);
  for (const operation of operations) {
    const stats = result.stats[operation.actionIndex];
    if (!stats) continue;
    const changesCost = operation.modifier !== "swap_power_level" && ENHANCED_LEVEL_SWAP_MODIFIERS.includes(operation.modifier);
    if (changesCost && (!operation.enhanced || !actionHasCakeCost(actions[operation.actionIndex]!, player))) {
      result.failures.push({ ...operation, error: "无耗饼的攻击没有耗饼数值可用于交换" });
      continue;
    }
    const final = operation.enhanced || finalLevelMode.has(operation.actionIndex);
    const current = !final && crystals > 0 ? offsetAttackStats(stats, 0, -crystals) : stats;
    let modified = applyAttackStatModifierChoice(current, operation.modifier);
    if (!final && crystals > 0) modified = offsetAttackStats(modified, 0, crystals);
    const impossibleCost = modified.costValue && isUnboundedCombatValue(modified.costValue) &&
      compareCombatValues(modified.costValue, []) > 0;
    const nextCost = changesCost ? Math.max(0, modified.cost) : result.costs[operation.actionIndex]!;
    const total = result.costs.reduce((sum, cost) => sum + cost, 0) - result.costs[operation.actionIndex]! + nextCost;
    if (changesCost && (impossibleCost || total > available)) {
      result.failures.push({ ...operation, error: impossibleCost ? "无限耗饼无法支付，本次交换失败" : "饼不足，本次交换失败" });
      continue;
    }
    if (operation.enhanced) finalLevelMode.add(operation.actionIndex);
    if (operation.ignoreEarthBreak) modified.ignoreEarthBreak = true;
    result.stats[operation.actionIndex] = modified;
    result.costs[operation.actionIndex] = nextCost;
    if (!result.changedActionIndices.includes(operation.actionIndex)) result.changedActionIndices.push(operation.actionIndex);
  }
  return result;
}
