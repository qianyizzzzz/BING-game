import { AttackAction, GameState, PlayerState, SkillAction } from "../types";
import { BASE_ATTACKS } from "./attacks";
import { getActiveSkillCount } from "./gameFactory";
import { getSkillActionCost, getSkillPlay } from "../skills/registry";
import { getActiveFusionCount, getFreeSkillChargeId, getFusionEnhancementCount, getVortexCostOverride } from "../skills/fusion";
import { shareSpace } from "./spaces";
import { getJunengElementUnitCost, getJunengNumber } from "./junengNumbers";
import { GATHER_ELEMENT_ID } from "../bigCards/abilities";

export function getAttackActionCost(state: Pick<GameState, "players">, player: PlayerState, action: AttackAction): number {
  const override = player.attackCostOverrides?.[action.attackId];
  if (override !== undefined) return override * action.stacks;
  let unit = BASE_ATTACKS[action.attackId].cost;
  if (action.attackId === "he_bao" || action.attackId === "chao_he_bao") {
    unit -= 3 * getActiveSkillCount(player, "skill_80_20445");
    for (const owner of state.players) if (owner.status === "alive" && shareSpace(owner, player)) {
      unit -= getActiveFusionCount(owner, "核战") * (owner.id === player.id ? 5 : 3);
    }
  } else if (action.attackId === "qin" && getActiveSkillCount(player, "skill_98_7182") > 0) unit /= 2;
  return Math.max(0, unit) * action.stacks;
}

export function getSkillElementCost(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined,
  action: Pick<SkillAction, "skillId" | "bigCardInstanceId">): { element: string; perStack: number } | undefined {
  const cost = getSkillPlay(action.skillId)?.elementCost;
  return cost && player ? { ...cost, perStack: getJunengElementUnitCost(player, action, cost.perStack) } : cost;
}

export function getTurnSkillActionCost(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards">, action: SkillAction): number {
  if (action.skillId === "skill_90_32911" && (getActiveFusionCount(player, "杀级换") > 0 ||
    getActiveFusionCount(player, "火•杀•换") > 0)) return 0;
  if (action.skillId === "skill_86_14131" && getFusionEnhancementCount(player, action.skillId, ["魔音贯耳"]) > 0)
    return action.stacks;
  if (action.skillId === "skill_84_6114" && getActiveFusionCount(player, "猥琐大叔叔") > 0) return action.stacks;
  const vortexCost = getVortexCostOverride(player, action.skillId);
  if (vortexCost !== undefined) return vortexCost * action.stacks;
  const free = getFreeSkillChargeId(player, action.skillId) ? Math.min(action.stacks, Math.max(0, action.freeStacks ?? 0)) : 0;
  const cost = getSkillActionCost(action.skillId, action.stacks - free);
  return action.skillId === GATHER_ELEMENT_ID ? getJunengNumber(player, "1050401.cakeCost", cost, action.bigCardInstanceId) : cost;
}
