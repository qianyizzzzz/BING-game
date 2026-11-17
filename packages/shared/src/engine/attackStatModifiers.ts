import {
  AttackStats, AttackStatModifierChoice, GameState, PublicGameState, PlayerId, PlayerState,
  PlayerAction, INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER,
  EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER
} from "../types";
import { BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import { getActiveSkillCount, playerHasActiveSkill } from "./gameFactory";
import { shapeSkyAbsoluteAttack } from "./lingta";
import { applyAttackModifiers, getSkillAttackStats, getSkillCakeCostKind } from "../skills/registry";
import { discountCakeCost, getAttackActionCost, getTurnSkillActionCost } from "./actionCosts";
import { getEnhancedChildFusionIds, getFusionEnhancementCount, getFusionRecipe, getFusionSkillId } from "../skills/fusion";
import { ETERNAL_THUNDER_ID, HUNYAO_AREA_ID } from "../bigCards/abilities";
import { getHunyaoExpandedTargets, multiplyHunyaoAreaLevel } from "./hunyao";
import { shapeDragonBloodAttack } from "./starDragon";
import { applyCheatSharpBonus } from "./cheatServer";
import { getTianlieWave, shapeTianlieAttack, TIANLIE_STAT_MULTIPLIER } from "./tianlie";
import { addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues, divideCombatDamage, subtractCombatValues,
  fromLegacyCombatStat, getPointDamageTrait, INFINITY_VALUE, isUnboundedCombatValue, multiplyCombatValues, offsetAttackStats,
  projectCombatValue, scaleCombatValue, withAttackLevel, withAttackPower } from "./combatValues";
import type { CombatValue } from "./combatValues";
import { getDreamClashStats } from "./utopia";
import { getChaosExileStats } from "./chaos";
import { applyPurpleScale, PURPLE_SCALE_PREFIX } from "./purpleEye";
import { antiCakeCount, antiCakesForAction, youkaiCakeCount } from "./vacuum";
import { TIGER_NETHER, TIGER_STAB } from "./netherTigerIds";
import { DIVINE_BLIND_ID } from "./divineReversalIds";
import { demonAttackStats, empowerDemonAttack } from "./demons";
import { shapeShadowAttack } from "./shadowDance";
import { shapeDecayAttack } from "./decayCombat";
import { withSkillsIgnored, type SkillIgnore } from "./skillIgnore";
import { BUBBLE_ENHANCED_MOVE } from "./bubbleDreamIds";
import { FIVE_ELEMENTS_LEVEL, FIVE_ELEMENTS_LEVEL_PREFIX, FIVE_ELEMENTS_OPERATIONS, type FiveElementsOperation } from "./fiveElementsIds";
import { applyColdLight, type ColdLightField } from "./nineTribulations";
import { NINE_COLD_PREFIX } from "./nineTribulationsIds";

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
  const skillId = "1044";
  const base = player && getFusionEnhancementCount(player, skillId, ["毁灭之魂"]) > 0
    ? DESTRUCTION_SOUL_MODIFIERS : DESTRUCTION_STAT_MODIFIERS;
  const enhanced = player && getEnhancedChildFusionIds(player, "无限之力", getFusionSkillId("宗师之力")).size > 0;
  return enhanced ? [...base, ...INFINITE_DESTRUCTION_MODIFIERS] : base;
}

export function hasEnhancedLevelSwap(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions"> | undefined): boolean {
  return Boolean(player && getFusionEnhancementCount(player, "1090", ["杀级换"]) > 0);
}

export function actionHasCakeCost(action: PlayerAction, player?: PlayerState): boolean {
  if ("tianlieContinuationId" in action && action.tianlieContinuationId) return false;
  return action.type === "attack" || (action.type === "skill" && !action.waveContinuationId && getSkillCakeCostKind(action.skillId, player) !== "none");
}

export function getLevelSwapModifiers(player: PlayerState | undefined, action: PlayerAction): AttackStatModifierChoice[] {
  if (getActiveSkillCount(player, DIVINE_BLIND_ID))
    return hasEnhancedLevelSwap(player) && actionHasCakeCost(action, player) ? ["swap_cost_power"] : [];
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
  if (stats.noClashLevel && (modifier === "swap_power_level" || modifier === "swap_cost_level" || modifier.startsWith("rotate_"))) return stats;
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
  const fixedPower = stats.fixedPointPower || (stats.id === ETERNAL_THUNDER_ID && stats.traits.includes("defeat_retire"));
  const nextPower = replacePower ?? (fixedPower ? power : changePower(power));
  const result = withAttackLevel(withAttackPower(replacePower !== undefined && stats.fixedPointPower ?
    { ...stats, fixedPointPower: false } : stats, nextPower), nextLevel);
  result.costValue = nextCost;
  result.cost = isUnboundedCombatValue(nextCost) && compareCombatValues(nextCost, []) > 0
    ? INFINITE_DAMAGE : projectCombatValue(nextCost);
  if (stats.damageParts) {
    result.damagePartValues = stats.damageParts.map((part, index) => stats.repeatedDamageParts || index === 0 ? nextPower :
      changePower(stats.damagePartValues?.[index] ?? combatValue(part)));
    result.damageParts = result.damagePartValues.map(projectCombatValue);
  }
  const originalDefeatTrait = stats.traits.find(trait => trait.startsWith("defeat_")) ??
    (stats.powerValue === undefined ? getPointDamageTrait(power) : undefined);
  const nextDefeatTrait = replacePower !== undefined ? getPointDamageTrait(nextPower) :
    compareCombatValues(nextPower, []) > 0 ? originalDefeatTrait : undefined;
  result.traits = stats.traits.filter(trait => !trait.startsWith("defeat_"));
  if (nextDefeatTrait) result.traits.push(nextDefeatTrait);
  if (stats.tianlieRaging) result.fixedPointPower = nextDefeatTrait === "defeat_vanish";
  return result;
}

export type AttackStatOperation = {
  id: string;
  actionIndex: number;
} & ({ multiplier: number; powerOnly?: true } | { symbolicMultiplier: CombatValue } | { fiveElements: FiveElementsOperation } |
  { coldLight: ColdLightField } |
  { purple: { purplePower?: number; purpleLevel?: number } } | {
  modifier: AttackStatModifierChoice;
  enhanced: boolean;
  ignoreEarthBreak?: boolean;
  asuraSwordLayer?: true;
});

export function parseAttackStatOperation(player: PlayerState, buff: PlayerState["buffs"][number]): AttackStatOperation | undefined {
  if (buff.id.startsWith(NINE_COLD_PREFIX) && buff.attackActionIndex !== undefined) {
    const field = buff.id.split(":")[1];
    if (field === "power" || field === "level") return { id: buff.id, actionIndex: buff.attackActionIndex, coldLight: field };
  }
  if (buff.id.startsWith(FIVE_ELEMENTS_LEVEL_PREFIX) && buff.attackActionIndex !== undefined && getActiveSkillCount(player, FIVE_ELEMENTS_LEVEL)) {
    const operation = FIVE_ELEMENTS_OPERATIONS.find((key) => buff.id.endsWith(`:${key}`));
    if (operation) return { id: buff.id, actionIndex: buff.attackActionIndex, fiveElements: operation };
  }
  if (buff.stateType === BUBBLE_ENHANCED_MOVE && buff.attackActionIndex !== undefined && buff.resourceValue)
    return { id: buff.id, actionIndex: buff.attackActionIndex, symbolicMultiplier: buff.resourceValue };
  if (buff.id.startsWith("fallen_splendor_double:")) {
    const actionIndex = Number(buff.id.split(":")[1]);
    return { id: buff.id, actionIndex, multiplier: 2, powerOnly: true };
  }
  if (buff.id.startsWith(PURPLE_SCALE_PREFIX)) {
    const actionIndex = Number(buff.id.slice(PURPLE_SCALE_PREFIX.length).split(":")[0]);
    return { id: buff.id, actionIndex, purple: { ...(buff.purplePower === undefined ? {} : { purplePower: buff.purplePower }),
      ...(buff.purpleLevel === undefined ? {} : { purpleLevel: buff.purpleLevel }) } };
  }
  if (buff.id.startsWith(TIANLIE_STAT_MULTIPLIER)) {
    const actionIndex = Number(buff.id.slice(TIANLIE_STAT_MULTIPLIER.length).split(":")[0]);
    return { id: buff.id, actionIndex, multiplier: buff.stacks };
  }
  if (!buff.id.startsWith(ATTACK_STAT_MODIFIER_BUFF_PREFIX)) return undefined;
  const [index, modifier] = buff.id.slice(ATTACK_STAT_MODIFIER_BUFF_PREFIX.length).split(":");
  if (!Number.isInteger(Number(index)) || Number(index) < 0 || !isAttackStatModifierChoice(modifier)) return undefined;
  const sourceFusion = player.skillFusions?.find((fusion) => fusion.id === buff.sourceFusionId);
  const name = sourceFusion && getFusionRecipe(sourceFusion.skillId)?.skill.name;
  return { id: buff.id, actionIndex: Number(index), modifier, enhanced: name === "杀级换",
    ignoreEarthBreak: name === "宗师之力", ...(buff.asuraSwordLayer ? { asuraSwordLayer: true } : {}) };
}

export interface PlayerAttackStatPreview {
  stats: Record<number, AttackStats>;
  waveStats: Record<number, AttackStats>;
  costs: number[];
  originalCosts: number[];
  changedActionIndices: number[];
  failures: Array<{ id: string; actionIndex: number; error: string }>;
}

export function nonAttackClashStats(action: PlayerAction): AttackStats | undefined {
  if (action.type !== "skill") return undefined;
  if (action.skillId === "1035") return { id: "1035", name: "电击法术", cost: 0, power: 0,
    level: INFINITE_DAMAGE, defenseTag: "unblockable", traits: ["skill"], element: "electric", elements: ["electric"],
    isArea: false, isSkill: true, stacks: 1, nonAttackMove: true };
  const stats = getSkillAttackStats(action.skillId, action.stacks);
  return getDreamClashStats(action) ?? getChaosExileStats(action) ?? (stats?.nonAttackMove ? stats : undefined);
}

/** Same pure preview is used by validation, the controls and final hit settlement. */
export function shapeTigerStab(action: PlayerAction, stats: AttackStats): AttackStats {
  if (action.type !== "skill") return stats;
  if (action.skillId === TIGER_NETHER) return { ...stats, fixedPointPower: true };
  if (action.skillId !== TIGER_STAB) return stats;
  const x = action.tigerPower ?? 0;
  return withAttackLevel(withAttackPower(stats, combatValue(x)),
    x === 0 ? INFINITY_VALUE : combatValue(Math.floor(25 / x)));
}

export function previewPlayerAttackStats(
  input: GameState | PublicGameState, playerId: PlayerId, candidate?: AttackStatOperation, includeNonAttackClashes = false,
  ignoredOwnerSkills?: SkillIgnore
): PlayerAttackStatPreview {
  const state = structuredClone(input) as GameState;
  const publicState = input as PublicGameState;
  state.pendingActions ??= structuredClone(publicState.revealedActions ?? {});
  state.turnActionCosts ??= structuredClone(publicState.revealedActionCosts ?? {});
  const player = state.players.find((entry) => entry.id === playerId);
  return withSkillsIgnored(player, ignoredOwnerSkills, () =>
    buildPlayerAttackStatPreview(state, input, player, playerId, candidate, includeNonAttackClashes));
}

function buildPlayerAttackStatPreview(state: GameState, input: GameState | PublicGameState, player: PlayerState | undefined,
  playerId: PlayerId, candidate: AttackStatOperation | undefined, includeNonAttackClashes: boolean): PlayerAttackStatPreview {
  const publicState = input as PublicGameState;
  const actions = state.pendingActions[playerId]?.actions ?? [];
  const result: PlayerAttackStatPreview = { stats: {}, waveStats: {}, costs: [], originalCosts: [], changedActionIndices: [], failures: [] };
  if (!player) return result;
  result.originalCosts = actions.map((action, index) => state.turnActionCosts?.[playerId]?.[index] ??
    (player.entityClasses?.includes("demon") ? 0 : action.type === "attack" ? getAttackActionCost(state, player, action) :
      action.type === "skill" ? getTurnSkillActionCost(player, action, state) : 0));
  result.costs = [...result.originalCosts];
  const cached = state.turnAttackStats?.[playerId];
  if (cached && !candidate) {
    result.stats = structuredClone(includeNonAttackClashes ? cached :
      Object.fromEntries(Object.entries(cached).filter(([, stats]) => !stats.nonAttackMove)));
    return result;
  }
  for (const [index, action] of actions.entries()) {
    const nonAttack = nonAttackClashStats(action);
    if (nonAttack) {
      if (includeNonAttackClashes) result.stats[index] = nonAttack;
      continue;
    }
    const continuation = getTianlieWave(player, action);
    let base = action.type === "attack" ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks) :
      action.type === "skill" ? getSkillAttackStats(action.skillId, action.stacks) : undefined;
    base = demonAttackStats(player, action, base);
    if (base) base = shapeShadowAttack(state, action, base);
    if (base) base = shapeDecayAttack(player, base);
    if (base) base = shapeTianlieAttack(player, shapeTigerStab(action, base));
    if (continuation) base = continuation.stats;
    if (base && !continuation) base = shapeDragonBloodAttack(state, playerId, action, base);
    if (base && !continuation) base = shapeWaveAttack(state, player, action, base);
    if (!base || base.nonAttackMove) continue;
    if (base.repeatedDamageParts || action.type === "skill" && isWaveSkill(action.skillId))
      result.waveStats[index] = { ...base, cost: result.originalCosts[index]! };
    let stats = continuation ? { ...base } : applyCheatSharpBonus(player, applyAttackModifiers(state, playerId, base, index));
    stats = shapeSkyAbsoluteAttack(stats, player, state.roundNumber);
    stats = empowerDemonAttack(state, player, stats);
    if (!continuation && getActiveSkillCount(player, HUNYAO_AREA_ID) && stats.id !== "1035") {
      const prefix = `absolute_guard:${index}:`;
      const [guardMode, guardId] = player.buffs.find((buff) => buff.id.startsWith(prefix))?.id.slice(prefix.length).split(":") ?? [];
      const forcedArea = playerHasActiveSkill(player, "1053") || playerHasActiveSkill(player, "1097");
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
  const paidWithAnti = actions.map((action, index) => antiCakesForAction(action) > 0 && antiCakesForAction(action) === result.originalCosts[index]);
  const balances = [player.cakes + youkaiCakeCount(player), antiCakeCount(player)];
  result.originalCosts.forEach((cost, index) => { balances[Number(paidWithAnti[index])]! += cost; });
  const crystals = getActiveSkillCount(player, "1032") +
    getFusionEnhancementCount(player, "1032", ["神域之种", "神界炼魂"]);
  const finalLevelMode = new Set<number>();
  const swordLayers = new Map<number, number>();
  const operations = player.buffs.map((buff) => parseAttackStatOperation(player, buff)).filter((op): op is AttackStatOperation => Boolean(op));
  if (candidate) operations.push(candidate);
  for (const operation of operations) {
    const stats = result.stats[operation.actionIndex];
    if (!stats) continue;
    if ("coldLight" in operation) {
      result.stats[operation.actionIndex] = applyColdLight(stats, operation.coldLight);
      if (result.waveStats[operation.actionIndex]) result.waveStats[operation.actionIndex] =
        applyColdLight(result.waveStats[operation.actionIndex]!, operation.coldLight);
      if (!result.changedActionIndices.includes(operation.actionIndex)) result.changedActionIndices.push(operation.actionIndex);
      continue;
    }
    if ("fiveElements" in operation) {
      const changeLevel = (move: AttackStats) => {
        const transform = { add: addCombatValues, subtract: subtractCombatValues,
          multiply: multiplyCombatValues, divide: divideCombatDamage }[operation.fiveElements];
        return withAttackLevel(move, transform(attackLevelValue(move), INFINITY_VALUE));
      };
      result.stats[operation.actionIndex] = changeLevel(stats);
      if (result.waveStats[operation.actionIndex]) result.waveStats[operation.actionIndex] = changeLevel(result.waveStats[operation.actionIndex]!);
      continue;
    }
    if ("purple" in operation) {
      result.stats[operation.actionIndex] = applyPurpleScale(stats, operation.purple);
      if (result.waveStats[operation.actionIndex]) result.waveStats[operation.actionIndex] =
        applyPurpleScale(result.waveStats[operation.actionIndex]!, operation.purple);
      continue;
    }
    if ("symbolicMultiplier" in operation) {
      const multiply = (value: AttackStats): AttackStats => {
        const power = (part: CombatValue) => multiplyCombatValues(part, operation.symbolicMultiplier);
        const result = withAttackLevel(withAttackPower(value, power(attackPowerValue(value))), power(attackLevelValue(value)));
        if (value.damagePartValues || value.damageParts) {
          result.damagePartValues = (value.damagePartValues ?? value.damageParts!.map((part) => combatValue(part))).map(power);
          result.damageParts = result.damagePartValues.map(projectCombatValue);
        }
        return { ...result, traits: [...new Set([...result.traits, "pierce_rebound" as const])] };
      };
      result.stats[operation.actionIndex] = multiply(stats);
      if (result.waveStats[operation.actionIndex]) result.waveStats[operation.actionIndex] = multiply(result.waveStats[operation.actionIndex]!);
      if (!result.changedActionIndices.includes(operation.actionIndex)) result.changedActionIndices.push(operation.actionIndex);
      continue;
    }
    if (stats.nonAttackMove) continue;
    if ("multiplier" in operation) {
      const multiply = (value: AttackStats) => {
        const power = (part: CombatValue) => value.fixedPointPower || value.id === ETERNAL_THUNDER_ID && value.traits.includes("defeat_retire") ?
          part : scaleCombatValue(part, operation.multiplier);
        const next = withAttackLevel(withAttackPower(value, power(attackPowerValue(value))),
          operation.powerOnly ? attackLevelValue(value) : scaleCombatValue(attackLevelValue(value), operation.multiplier));
        if (value.damagePartValues || value.damageParts) {
          next.damagePartValues = (value.damagePartValues ?? value.damageParts!.map((part) => combatValue(part))).map(power);
          next.damageParts = next.damagePartValues.map(projectCombatValue);
        }
        return next;
      };
      result.stats[operation.actionIndex] = multiply(stats);
      if (result.waveStats[operation.actionIndex]) result.waveStats[operation.actionIndex] = multiply(result.waveStats[operation.actionIndex]!);
      if (!result.changedActionIndices.includes(operation.actionIndex)) result.changedActionIndices.push(operation.actionIndex);
      continue;
    }
    const changesCost = operation.modifier !== "swap_power_level" && ENHANCED_LEVEL_SWAP_MODIFIERS.includes(operation.modifier);
    if (changesCost && (!operation.enhanced || !actionHasCakeCost(actions[operation.actionIndex]!, player))) {
      result.failures.push({ ...operation, error: "无耗饼的攻击没有耗饼数值可用于交换" });
      continue;
    }
    const final = operation.enhanced || finalLevelMode.has(operation.actionIndex);
    const inherited = Boolean(getTianlieWave(player, actions[operation.actionIndex]!));
    const current = !inherited && !final && crystals > 0 ? offsetAttackStats(stats, 0, -crystals) : stats;
    let modified = applyAttackStatModifierChoice(current, operation.modifier);
    if (operation.asuraSwordLayer) {
      const layers = (swordLayers.get(operation.actionIndex) ?? 0) + 1;
      swordLayers.set(operation.actionIndex, layers);
      modified = withAttackPower(modified, combatValue(1, layers + 1));
    }
    if (!inherited && !final && crystals > 0) modified = offsetAttackStats(modified, 0, crystals);
    const impossibleCost = modified.costValue && isUnboundedCombatValue(modified.costValue) &&
      compareCombatValues(modified.costValue, []) > 0;
    const nextCost = changesCost ? discountCakeCost(state, player, Math.max(0, modified.cost)) : result.costs[operation.actionIndex]!;
    const anti = Boolean(paidWithAnti[operation.actionIndex]);
    const total = result.costs.reduce((sum, cost, index) => Boolean(paidWithAnti[index]) === anti ? sum + cost : sum, 0) -
      result.costs[operation.actionIndex]! + nextCost;
    if (changesCost && (impossibleCost || total > balances[Number(anti)]! || anti && !Number.isSafeInteger(nextCost))) {
      result.failures.push({ ...operation, error: impossibleCost ? "无限耗饼无法支付，本次交换失败" : "饼不足，本次交换失败" });
      continue;
    }
    if (operation.enhanced) finalLevelMode.add(operation.actionIndex);
    if (operation.ignoreEarthBreak) modified.ignoreEarthBreak = true;
    const wave = result.waveStats[operation.actionIndex];
    if (wave) result.waveStats[operation.actionIndex] = applyAttackStatModifierChoice(wave, operation.modifier);
    result.stats[operation.actionIndex] = modified;
    result.costs[operation.actionIndex] = nextCost;
    if (!result.changedActionIndices.includes(operation.actionIndex)) result.changedActionIndices.push(operation.actionIndex);
  }
  return result;
}
import { isWaveSkill, shapeWaveAttack } from "./qianqiu";
