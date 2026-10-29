import { AttackAction, GameState, PlayerState, SkillAction } from "../types";
import { BASE_ATTACKS } from "./attacks";
import { getActiveSkillCount } from "./gameFactory";
import { getSkillActionCost } from "../skills/registry";
import { getActiveFusionCount, getFreeSkillChargeId } from "../skills/fusion";

export function getAttackActionCost(state: Pick<GameState, "players">, player: PlayerState, action: AttackAction): number {
  const override = player.attackCostOverrides?.[action.attackId];
  if (override !== undefined) return override * action.stacks;
  let unit = BASE_ATTACKS[action.attackId].cost;
  if (action.attackId === "he_bao" || action.attackId === "chao_he_bao") {
    unit -= 3 * getActiveSkillCount(player, "skill_80_20445");
    for (const owner of state.players) if (owner.status === "alive") {
      unit -= getActiveFusionCount(owner, "核战") * (owner.id === player.id ? 5 : 3);
    }
  } else if (action.attackId === "qin" && getActiveSkillCount(player, "skill_98_7182") > 0) unit /= 2;
  return Math.max(0, unit) * action.stacks;
}

export function getTurnSkillActionCost(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions">, action: SkillAction): number {
  const free = getFreeSkillChargeId(player, action.skillId) ? Math.min(action.stacks, Math.max(0, action.freeStacks ?? 0)) : 0;
  return getSkillActionCost(action.skillId, action.stacks - free);
}
