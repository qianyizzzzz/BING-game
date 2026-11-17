import { AttackStats, PlayerState } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { getActiveFusionCount } from "../skills/fusion";
import { withSkillsIgnored } from "./skillIgnore";
import { TIGER_FINAL } from "./netherTigerIds";
import { GOD_KING_JUDGMENT_ID } from "../bigCards/abilities";
import { MOON_TIDE_ID } from "./moonIds";

type ReboundOwner = Pick<PlayerState, "skills" | "buffs" | "skillFusions">;
export type ReboundInteraction = "pierced" | "blocked" | "reflected";

/** Snapshot the declaring player's privileges; reflected/reversed packets retain their original properties. */
export function applyReboundSkillModifiers(player: ReboundOwner | undefined, attack: AttackStats): AttackStats {
  let result = attack;
  if (getActiveSkillCount(player, "1058") > 0) result = {
    ...result, traits: Array.from(new Set([...result.traits, "pierce_rebound"])), ignoreAbsoluteRebound: true
  };
  if (getActiveFusionCount(player, "根源之目") > 0) result = { ...result, ignoreElasticRebound: true };
  return result;
}

/** Ball cancels piercing, Eye cancels absolute rebound, and Origin cancels Ball. Resolve these independently. */
export function getReboundInteraction(player: ReboundOwner | undefined, attack: AttackStats): ReboundInteraction {
  return withSkillsIgnored(player, attack.targetSkillIgnore, () => evaluateRebound(player, attack));
}

export function canIgnoreReboundPiercing(player: ReboundOwner | undefined, attack: AttackStats): boolean {
  return !attack.ignoreElasticRebound && getActiveFusionCount(player, "弹力球") > 0;
}

function evaluateRebound(player: ReboundOwner | undefined, attack: AttackStats): ReboundInteraction {
  if (attack.ignoreRebounds || attack.piercesDefenseMoves) return "pierced";
  if (attack.id === MOON_TIDE_ID) return canIgnoreReboundPiercing(player, attack) ? "blocked" : "pierced";
  if (attack.defenseTag === "rebound") return "blocked";
  const requiresAbsolute = attack.isSkill || attack.requiresAbsoluteRebound || attack.id === "he_bao" || attack.id === "chao_he_bao";
  const absolute = !attack.ignoreAbsoluteRebound && getActiveSkillCount(player, "1056") > 0 && requiresAbsolute;
  const elastic = canIgnoreReboundPiercing(player, attack);
  if (attack.traits.includes("pierce_rebound") && !elastic && !absolute) return "pierced";
  if (requiresAbsolute && !absolute && ![GOD_KING_JUDGMENT_ID, TIGER_FINAL].includes(attack.id)) return "blocked";
  return "reflected";
}
