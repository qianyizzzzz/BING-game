import { AttackStats, GameState, PlayerId } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { getFusionEnhancementCount, getFusionRecipe, getWitherNumber, isFusionActive } from "../skills/fusion";
import { ETERNAL_NIGHT_SKILL_ID, HUNYAO_LIGHT_ID, SUNSHINE_SKILL_ID } from "../bigCards/abilities";
import { attackLevelValue, attackPowerValue, combatValue, compareCombatValues, INFINITY_VALUE } from "./combatValues";
import { playersInSpace } from "./spaces";

export function getAttackFieldBlocker(state: Pick<GameState, "players">, sourceId: PlayerId, stats: AttackStats, targetId?: PlayerId) {
  const power = attackPowerValue(stats), level = attackLevelValue(stats);
  const players = playersInSpace(state, sourceId);
  const powerComparedTo = (amount: number) => compareCombatValues(power, combatValue(amount));
  const decayOwners = players.filter((player) => player.status === "alive" &&
    getActiveSkillCount(player, "skill_11_89360") > 0 && (
      level.length === 0 || power.length === 0 || compareCombatValues(power, INFINITY_VALUE) >= 0 ||
      (player.skillFusions ?? []).some((fusion) => isFusionActive(player, fusion) &&
        getFusionRecipe(fusion.skillId)?.skill.name === "枯萎" &&
        [power, level].some(value => compareCombatValues(value, combatValue(getWitherNumber(player, fusion.witherSelectionIndex ?? 0))) === 0))
    ));
  if (decayOwners.length) return { skillId: "skill_11_89360", name: "衰竭", enabled: true,
    ownerIds: decayOwners.map((player) => player.id) };
  const ignoresLightFields = getActiveSkillCount(state.players.find((player) => player.id === sourceId), HUNYAO_LIGHT_ID) > 0;
  const rules = [
    { skillId: "skill_42_94266", name: "破地之力", enabled: !stats.ignoreEarthBreak && powerComparedTo(2) >= 0 && powerComparedTo(6) <= 0 },
    { skillId: SUNSHINE_SKILL_ID, name: "阳光普照", enabled: !ignoresLightFields && powerComparedTo(4) > 0 },
    { skillId: ETERNAL_NIGHT_SKILL_ID, name: "永远之夜", enabled: !ignoresLightFields && powerComparedTo(4) < 0 }
  ];
  for (const rule of rules) if (rule.enabled) {
    const owners = players.filter((player) => player.status === "alive" && getActiveSkillCount(player, rule.skillId) > 0 &&
      (rule.skillId !== "skill_42_94266" || (powerComparedTo(2) > 0 && powerComparedTo(6) < 0) ||
        getFusionEnhancementCount(player, rule.skillId, ["山河破碎"]) > 0) &&
      (!["skill_43_74082", "skill_44_20092"].includes(rule.skillId) ||
        getActiveSkillCount(player, rule.skillId) > getFusionEnhancementCount(player, rule.skillId, ["阳光之夜"]) || player.id === sourceId || player.id === targetId));
    if (owners.length) return { ...rule, ownerIds: owners.map((player) => player.id) };
  }
  return undefined;
}
