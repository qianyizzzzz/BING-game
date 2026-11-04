import {
  AttackStats, AttackStatModifierChoice, GameState, PublicGameState, PlayerId, PlayerState,
  PlayerAction, INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER,
  EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER
} from "../types";
import { BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import { getActiveSkillCount } from "./gameFactory";
import { applyAttackModifiers, getSkillAttackStats, getSkillCakeCostKind } from "../skills/registry";
import { getAttackActionCost, getTurnSkillActionCost } from "./actionCosts";
import { getFusionEnhancementCount, getFusionRecipe } from "../skills/fusion";

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
  return [...ENHANCED_LEVEL_SWAP_MODIFIERS, ...DESTRUCTION_STAT_MODIFIERS].includes(value as AttackStatModifierChoice);
}

export function attackStatModifierLabel(modifier: AttackStatModifierChoice): string {
  const labels: Record<AttackStatModifierChoice, string> = {
    swap_power_level: "攻击与等级交换", swap_cost_power: "耗饼与攻击交换", swap_cost_level: "耗饼与等级交换",
    rotate_cost_power_level: "耗饼→等级，攻击→耗饼，等级→攻击",
    rotate_cost_level_power: "耗饼→攻击，攻击→等级，等级→耗饼",
    power_plus_1_level_minus_1: "攻击+1，等级-1", power_minus_1_level_plus_1: "攻击-1，等级+1",
    power_plus_2_level_minus_2: "攻击+2，等级-2", power_minus_2_level_plus_2: "攻击-2，等级+2",
    power_times_3_level_to_zero: "攻击×3，等级变为0", power_to_zero_level_times_4: "攻击变为0，等级×4"
  };
  return labels[modifier];
}

export function payableAttackCost(value: number): number {
  return Math.max(0, Math.min(INFINITE_DAMAGE, value));
}

/** Numeric defeat values move with power; their old traits must not remain on a finite attack. */
function syncDefeatTraits(stats: AttackStats): AttackStats {
  const traits = stats.traits.filter((trait) => !["defeat_retire", "defeat_vanish", "defeat_execute", "defeat_explode"].includes(trait));
  if (stats.power >= EXPLODE_EFFECT_POWER) traits.push("defeat_explode");
  else if (stats.power >= EXECUTE_EFFECT_POWER) traits.push("defeat_execute");
  else if (stats.power >= VANISH_EFFECT_POWER) traits.push("defeat_vanish");
  else if (stats.power >= RETIRE_EFFECT_POWER) traits.push("defeat_retire");
  return { ...stats, traits };
}

export function applyAttackStatModifierChoice(stats: AttackStats, modifier: AttackStatModifierChoice): AttackStats {
  const { cost, power, level } = stats;
  const add = (value: number, delta: number) => Math.abs(value) >= INFINITE_DAMAGE ? value : value + delta;
  const multiply = (value: number, factor: number) => Math.abs(value) >= INFINITE_DAMAGE ? value : value * factor;
  let result: AttackStats;
  switch (modifier) {
    case "swap_power_level": result = { ...stats, power: level, level: power }; break;
    case "swap_cost_power": result = { ...stats, cost: Math.min(INFINITE_DAMAGE, power), power: cost }; break;
    case "swap_cost_level": result = { ...stats, cost: Math.min(INFINITE_DAMAGE, level), level: cost }; break;
    case "rotate_cost_power_level": result = { ...stats, cost: Math.min(INFINITE_DAMAGE, power), power: level, level: cost }; break;
    case "rotate_cost_level_power": result = { ...stats, cost: Math.min(INFINITE_DAMAGE, level), power: cost, level: power }; break;
    case "power_plus_1_level_minus_1": result = { ...stats, power: add(power, 1), level: add(level, -1) }; break;
    case "power_minus_1_level_plus_1": result = { ...stats, power: add(power, -1), level: add(level, 1) }; break;
    case "power_plus_2_level_minus_2": result = { ...stats, power: add(power, 2), level: add(level, -2) }; break;
    case "power_minus_2_level_plus_2": result = { ...stats, power: add(power, -2), level: add(level, 2) }; break;
    case "power_times_3_level_to_zero": result = { ...stats, power: multiply(power, 3), level: 0 }; break;
    case "power_to_zero_level_times_4": result = { ...stats, power: 0, level: multiply(level, 4) }; break;
  }
  return syncDefeatTraits(result);
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
    const base = action.type === "attack" ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks) :
      action.type === "skill" ? getSkillAttackStats(action.skillId, action.stacks) : undefined;
    if (!base) continue;
    let stats = applyAttackModifiers(state, playerId, base, index);
    const specialPower = stats.traits.includes("defeat_explode") ? EXPLODE_EFFECT_POWER :
      stats.traits.includes("defeat_execute") ? EXECUTE_EFFECT_POWER : stats.traits.includes("defeat_vanish") ? VANISH_EFFECT_POWER :
      stats.traits.includes("defeat_retire") ? RETIRE_EFFECT_POWER : 0;
    stats = { ...stats, cost: result.originalCosts[index]!, power: specialPower ? Math.max(stats.power, specialPower) : stats.power };
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
    const current = !final && crystals > 0 ? { ...stats, level: stats.level - crystals } : stats;
    let modified = applyAttackStatModifierChoice(current, operation.modifier);
    if (!final && crystals > 0) modified = { ...modified, level: modified.level + crystals };
    const nextCost = changesCost ? payableAttackCost(modified.cost) : result.costs[operation.actionIndex]!;
    const total = result.costs.reduce((sum, cost) => sum + cost, 0) - result.costs[operation.actionIndex]! + nextCost;
    if (changesCost && (nextCost >= INFINITE_DAMAGE || total > available)) {
      result.failures.push({ ...operation, error: nextCost >= INFINITE_DAMAGE ? "无限耗饼无法支付，本次交换失败" : "饼不足，本次交换失败" });
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
