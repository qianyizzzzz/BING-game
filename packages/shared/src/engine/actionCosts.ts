import { AttackAction, GameState, PlayerState, SkillAction } from "../types";
import { ASURA_SWORD_ID, SKY_ABSOLUTE_ID, SKY_STRIKE_ID } from "../bigCards/abilities";
import { hasBloodQi } from "./asura";
import { BASE_ATTACKS } from "./attacks";
import { getActiveSkillCount } from "./gameFactory";
import { getSkillActionCost, getSkillPlay } from "../skills/registry";
import { COMMON_FUSION_SKILL_ID, getActiveFusionCount, getFreeSkillChargeId, getFusionEnhancementCount, getVortexCostOverride } from "../skills/fusion";
import { shareSpace } from "./spaces";
import { getJunengElementUnitCost, getJunengNumber } from "./junengNumbers";
import { GATHER_ELEMENT_ID, THUNDER_BALL_ID, TIANLIE_ATTACK_ID } from "../bigCards/abilities";
import { hasTianlieRage } from "./tianlie";
import { getAttackMarkCount, getAttackMarkKind } from "./attackMarks";
import { getElementAmount } from "./elementResources";
import { thunderBallCapacity, thunderBallCount } from "./thunderItems";
import { isSaintMove } from "./saint";
import { KURONG_CAKES_ID, XIELING_TRANSFORM_ID } from "../bigCards/abilities";
import { getXielingConversionLimit } from "./xieling";
import { isNextWujinReboundFree } from "./wujin";
import { TIANMANG_FUSION_STATE } from "./tianmang";
import { SAKURA_ELEMENT, SAKURA_FALL_ID, SAKURA_RAIN_ID } from "../bigCards/abilities";
import { hasFreeSakuraFall } from "./sakura";
import { getSpringGrassNumber } from "./effectCategories";
import { antiCakeCount, availableCakeBalance, canUseAntiCakes, vacuumExtractCost, youkaiCakeCount } from "./vacuum";
import { VACUUM_EXTRACT_ID } from "./vacuumIds";
import { activeSwarmInsects } from "./swarm";
import { SUN_MOON_FUSION } from "./starMoonIds";
import { VETERAN_SHATTER_ID, VETERAN_SHATTER_USES } from "./swarmIds";
import { isShadowComboMove, shadowComboForAction } from "./shadowCombo";

type CakeCostState = Pick<GameState, "players"> & Partial<Pick<GameState, "roundNumber" | "smallSpaces">>;

type CakePayer = Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards"> &
  Partial<Pick<PlayerState, "id" | "cakes" | "spaceId" | "kurongCakeDiscount" | "shadowCombo">>;

export function getKurongCakeDiscount(state: Pick<GameState, "players"> | undefined, player: CakePayer): 0 | 1 | 3 {
  if (player.kurongCakeDiscount !== undefined) return player.kurongCakeDiscount;
  if (!state || player.cakes === undefined || !getActiveSkillCount(player, KURONG_CAKES_ID)) return 0;
  const cakes = player.cakes;
  const others = state.players.filter((other) => other.id !== player.id && other.status === "alive" &&
    other.kind !== "spectator" && other.spaceId === player.spaceId);
  if (others.some((other) => other.cakes < cakes)) return 1;
  return others.some((other) => other.cakes === cakes) ? 0 : 3;
}

export function discountCakeCost(state: Pick<GameState, "players"> | undefined, player: CakePayer, cost: number): number {
  const discount = cost > 0 ? getKurongCakeDiscount(state, player) : 0;
  const kurong = discount ? Math.max(1, cost - getSpringGrassNumber(player, KURONG_CAKES_ID, discount)) : cost;
  return discountSwarmCakeCost(player, kurong);
}

function discountSwarmCakeCost(player: CakePayer, cost: number): number {
  const flies = activeSwarmInsects(player, "fly");
  return flies ? Math.max(0, cost - flies / 4) : cost;
}

export function getReboundCakeCost(state: CakeCostState, player: PlayerState, free = false): number {
  const rules = { roundNumber: state.roundNumber ?? 1, smallSpaces: state.smallSpaces ?? {} };
  const balance = (player.cakes + youkaiCakeCount(player)) || (canUseAntiCakes(rules, player) ? antiCakeCount(player) : 0);
  return free || isNextWujinReboundFree(player) ? 0 : discountCakeCost(state, player, balance);
}

export function hasReboundCakeBalance(state: CakeCostState, player: PlayerState): boolean {
  return availableCakeBalance({ roundNumber: state.roundNumber ?? 1, smallSpaces: state.smallSpaces ?? {} }, player) > 0;
}

export function getAttackActionCost(state: Pick<GameState, "players">, player: PlayerState, action: AttackAction & { roarContinuationId?: string; sandDelayedActionId?: string }): number {
  if (action.roarContinuationId || action.sandDelayedActionId) return 0;
  return discountCakeCost(state, player, getAttackCostBeforeKurong(state, player, action));
}

export function getAttackCostBeforeKurong(state: Pick<GameState, "players">, player: PlayerState, action: AttackAction): number {
  if (action.tianlieContinuationId || action.freeMoveId) return 0;
  const override = player.attackCostOverrides?.[action.attackId];
  if (override !== undefined) return override * action.stacks;
  let unit = BASE_ATTACKS[action.attackId].cost;
  if (action.attackId === "he_bao" || action.attackId === "chao_he_bao") {
    unit -= 3 * getActiveSkillCount(player, "1079");
    for (const owner of state.players) if (owner.status === "alive" && shareSpace(owner, player)) {
      unit -= getActiveFusionCount(owner, "核战") * (owner.id === player.id ? 5 : 3);
    }
  } else if (action.attackId === "qin" && getActiveSkillCount(player, "1097") > 0) unit /= 2;
  return Math.max(0, unit) * action.stacks;
}

export function getSkillElementCost(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined,
  action: Pick<SkillAction, "skillId" | "bigCardInstanceId" | "freeMoveId" | "saintElement" | "freeStacks" | "waveContinuationId">): { element: string; perStack: number } | undefined {
  if (action.freeMoveId || action.waveContinuationId || action.skillId === SKY_STRIKE_ID && action.freeStacks) return undefined;
  if (action.skillId === SAKURA_RAIN_ID) return { element: SAKURA_ELEMENT, perStack: getElementAmount(player, SAKURA_ELEMENT) };
  if (action.skillId === SAKURA_FALL_ID && !hasFreeSakuraFall(player))
    return { element: SAKURA_ELEMENT, perStack: 10 };
  if (action.saintElement && isSaintMove(action.skillId)) return { element: action.saintElement, perStack: 1 };
  const cost = getSkillPlay(action.skillId)?.elementCost;
  return cost && player ? { ...cost, perStack: getJunengElementUnitCost(player, action, cost.perStack) } : cost;
}

export function getTurnSkillActionCost(player: CakePayer, action: SkillAction & { roarContinuationId?: string; sandDelayedActionId?: string }, state?: CakeCostState): number {
  if (action.roarContinuationId || action.sandDelayedActionId) return 0;
  if (action.skillId === SKY_ABSOLUTE_ID) return discountSwarmCakeCost(player, player.cakes ?? 0);
  if (action.skillId === VACUUM_EXTRACT_ID && !action.freeMoveId) return discountCakeCost(state, player,
    vacuumExtractCost({ roundNumber: state?.roundNumber ?? 1, smallSpaces: state?.smallSpaces ?? {} }, player));
  return discountCakeCost(state, player, getSkillCostBeforeKurong(player, action));
}

export function getSkillElementCosts(player: Parameters<typeof getSkillElementCost>[0], action: Parameters<typeof getSkillElementCost>[1]) {
  const primary = getSkillElementCost(player, action);
  if (!primary) return [];
  const additional = getSkillPlay(action.skillId)?.additionalElementCost;
  return additional ? [primary, additional] : [primary];
}

function getSkillCostBeforeKurong(player: CakePayer, action: SkillAction): number {
  if (action.waveContinuationId || action.tianlieContinuationId || action.freeMoveId) return 0;
  if (action.skillId === "1081" && getActiveSkillCount(player, SUN_MOON_FUSION) &&
    player.buffs.some(({ id, huiyueAllowsMoves }) => id === "huiyue_stasis" && huiyueAllowsMoves)) return 0;
  if (action.skillId === COMMON_FUSION_SKILL_ID && player.buffs.some((buff) => buff.stateType === TIANMANG_FUSION_STATE)) return 0;
  if (action.saintElement && isSaintMove(action.skillId)) return 0;
  if (action.skillId === TIANLIE_ATTACK_ID && hasTianlieRage(player)) return 2 * action.stacks;
  if (action.skillId === "1109" && getActiveFusionCount(player, "雷霆之魂") > 0) return 2 * action.stacks;
  if (action.skillId === "1089" && (getActiveFusionCount(player, "杀级换") > 0 ||
    getActiveFusionCount(player, "火•杀•换") > 0)) return 0;
  if (action.skillId === "1085" && getFusionEnhancementCount(player, action.skillId, ["魔音贯耳"]) > 0)
    return action.stacks;
  if (action.skillId === "1083" && (getActiveFusionCount(player, "猥琐大叔叔") || getActiveFusionCount(player, "猥琐老司机")))
    return action.stacks;
  const vortexCost = getVortexCostOverride(player, action.skillId);
  if (vortexCost !== undefined) return vortexCost * action.stacks;
  const free = getFreeSkillChargeId(player, action.skillId) ? Math.min(action.stacks, Math.max(0, action.freeStacks ?? 0)) : 0;
  const cost = getSkillActionCost(action.skillId, action.stacks - free);
  if (isShadowComboMove(action) && (action.shadowCombo ?? shadowComboForAction(player, action)) >= 2) return Math.max(0, cost - 1);
  return action.skillId === GATHER_ELEMENT_ID ? getJunengNumber(player, "1050401.cakeCost", cost, action.bigCardInstanceId) : cost;
}

export function getAffordableSkillStacks(
  state: Pick<GameState, "roundNumber" | "players">, player: PlayerState, skillId: string, freeStacks = 0, saintElement?: string
): number {
  const play = getSkillPlay(skillId);
  if (!play) return 0;
  let limit = play.maxStacks;
  if (skillId === VETERAN_SHATTER_ID) limit = Math.min(limit, player.buffs.find(({ id }) => id === VETERAN_SHATTER_USES)?.stacks ?? 0);
  if (play.bloodQiCost && freeStacks === 0 && !hasBloodQi(player, skillId === ASURA_SWORD_ID ? 50 : play.bloodQiCost)) return 0;
  if (getAttackMarkKind(skillId)) {
    limit = Math.min(limit, getAttackMarkCount(player, skillId) ?? 0);
  } else if (skillId === "1036") {
    limit = Math.min(limit, player.buffs.find(({ id }) => id === "guidao_charge")?.stacks ?? 0);
  }
  for (const cost of getSkillElementCosts(player, { skillId, freeStacks, ...(saintElement ? { saintElement } : {}) })) {
    if (cost.perStack > 0) limit = Math.min(limit, Math.floor(getElementAmount(player, cost.element) / cost.perStack));
  }
  if (play.itemCost?.perStack) limit = Math.min(limit, Math.floor(thunderBallCount(player) / play.itemCost.perStack));
  if (skillId === THUNDER_BALL_ID) limit = Math.min(limit, thunderBallCapacity(player, state.roundNumber) - thunderBallCount(player));
  if (skillId === XIELING_TRANSFORM_ID && !getXielingConversionLimit(player)) return 0;
  if (limit <= 0) return 0;

  const affordable = (stacks: number) => getTurnSkillActionCost(player, {
    type: "skill", skillId, stacks, freeStacks: Math.min(stacks, freeStacks), ...(saintElement ? { saintElement } : {})
  }, state) <= availableCakeBalance(state, player);
  if (affordable(limit)) return limit;
  let min = 0;
  while (min < limit) {
    const middle = Math.ceil((min + limit) / 2);
    if (affordable(middle)) min = middle;
    else limit = middle - 1;
  }
  return min;
}
