import { AttackStats, GameState, INFINITE_DAMAGE, PlayerId } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { getFusionEnhancementCount, getFusionRecipe, getWitherNumber, isFusionActive } from "../skills/fusion";

export function getAttackFieldBlocker(state: Pick<GameState, "players">, sourceId: PlayerId, stats: AttackStats, targetId?: PlayerId) {
  const decayOwners = state.players.filter((player) => player.status === "alive" &&
    getActiveSkillCount(player, "skill_11_89360") > 0 && (
      stats.level === 0 || stats.power === 0 || stats.power >= INFINITE_DAMAGE ||
      (player.skillFusions ?? []).some((fusion) => isFusionActive(player, fusion) &&
        getFusionRecipe(fusion.skillId)?.skill.name === "枯萎" &&
        [stats.power, stats.level].includes(getWitherNumber(player, fusion.witherSelectionIndex ?? 0)))
    ));
  if (decayOwners.length) return { skillId: "skill_11_89360", name: "衰竭", enabled: true,
    ownerIds: decayOwners.map((player) => player.id) };
  const rules = [
    { skillId: "skill_42_94266", name: "破地之力", enabled: !stats.ignoreEarthBreak && stats.power > 2 && stats.power < 6 },
    { skillId: "skill_43_74082", name: "阳光普照", enabled: stats.power > 4 },
    { skillId: "skill_44_20092", name: "永远之夜", enabled: stats.power < 4 }
  ];
  for (const rule of rules) if (rule.enabled) {
    const owners = state.players.filter((player) => player.status === "alive" && getActiveSkillCount(player, rule.skillId) > 0 &&
      (!["skill_43_74082", "skill_44_20092"].includes(rule.skillId) ||
        getActiveSkillCount(player, rule.skillId) > getFusionEnhancementCount(player, rule.skillId, ["阳光之夜"]) || player.id === sourceId || player.id === targetId));
    if (owners.length) return { ...rule, ownerIds: owners.map((player) => player.id) };
  }
  return undefined;
}
