import { AttackStats, PlayerState } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { getActiveFusionCount } from "../skills/fusion";

type ReboundOwner = Pick<PlayerState, "skills" | "buffs" | "skillFusions">;
export type ReboundInteraction = "pierced" | "blocked" | "reflected";

/** Snapshot the declaring player's privileges; reflected/reversed packets retain their original properties. */
export function applyReboundSkillModifiers(player: ReboundOwner | undefined, attack: AttackStats): AttackStats {
  let result = attack;
  if (getActiveSkillCount(player, "skill_59_79990") > 0) result = {
    ...result, traits: Array.from(new Set([...result.traits, "pierce_rebound"])), ignoreAbsoluteRebound: true
  };
  if (getActiveFusionCount(player, "根源之目") > 0) result = { ...result, ignoreElasticRebound: true };
  return result;
}

/** Ball cancels piercing, Eye cancels absolute rebound, and Origin cancels Ball. Resolve these independently. */
export function getReboundInteraction(player: ReboundOwner | undefined, attack: AttackStats): ReboundInteraction {
  if (attack.defenseTag === "rebound") return "blocked";
  const requiresAbsolute = attack.isSkill || attack.requiresAbsoluteRebound || attack.id === "he_bao" || attack.id === "chao_he_bao";
  const absolute = !attack.ignoreAbsoluteRebound && getActiveSkillCount(player, "skill_57_59843") > 0 && requiresAbsolute;
  const elastic = !attack.ignoreElasticRebound && getActiveFusionCount(player, "弹力球") > 0;
  if (attack.traits.includes("pierce_rebound") && !elastic && !absolute) return "pierced";
  if (requiresAbsolute && !absolute) return "blocked";
  return "reflected";
}
