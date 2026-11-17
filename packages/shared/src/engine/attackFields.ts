import { AttackStats, GameState, PlayerId } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { getFusionEnhancementCount, getWitherNumber, getWitherSelectionGroups } from "../skills/fusion";
import { ETERNAL_NIGHT_SKILL_ID, HUNYAO_LIGHT_ID, JUEYING_RETIRE_ID, SUNSHINE_SKILL_ID, WUJIN_REBOUND_ID } from "../bigCards/abilities";
import { attackLevelValue, attackPowerValue, combatValue, compareCombatValues, INFINITY_VALUE } from "./combatValues";
import { playersInSpace } from "./spaces";
import { hasTianlieMight, withTianlieFusionsIgnored } from "./tianlie";
import { hasLingtaField } from "./lingta";
import { ignoresOpponentSkill } from "./seaGodIgnore";

export function getAttackFieldBlocker(state: Pick<GameState, "players">, sourceId: PlayerId, stats: AttackStats, targetId?: PlayerId,
  skippedSkills?: ReadonlySet<string>) {
  const power = attackPowerValue(stats), level = attackLevelValue(stats);
  const players = playersInSpace(state, sourceId);
  const source = state.players.find((player) => player.id === sourceId);
  const target = targetId ? state.players.find((player) => player.id === targetId) : undefined;
  const appliesToPair = (owner: (typeof players)[number], skillId: string) =>
    !ignoresOpponentSkill(source, owner.id, skillId) && !(owner.id === sourceId && ignoresOpponentSkill(target, sourceId, skillId));
  const ignoresFusions = hasTianlieMight(source);
  const powerComparedTo = (amount: number) => compareCombatValues(power, combatValue(amount));
  const isDecaying = (player: (typeof players)[number]) => player.status === "alive" && appliesToPair(player, "1010") &&
    getActiveSkillCount(player, "1010") > 0 && (
      level.length === 0 || power.length === 0 || compareCombatValues(power, INFINITY_VALUE) >= 0 ||
      getWitherSelectionGroups(player, true).some(({ indices }) => indices.some((index) =>
        [power, level].some(value => compareCombatValues(value, combatValue(getWitherNumber(player, index))) === 0)))
    );
  const decayOwners = players.filter((player) => ignoresFusions ?
    withTianlieFusionsIgnored(player, () => isDecaying(player)) : isDecaying(player));
  if (decayOwners.length && !skippedSkills?.has("1010")) return { skillId: "1010", name: "衰竭", enabled: true,
    ownerIds: decayOwners.map((player) => player.id) };
  const ignoresWujinFields = getActiveSkillCount(source, WUJIN_REBOUND_ID) > 0;
  const ignoresLightFields = ignoresWujinFields || getActiveSkillCount(source, HUNYAO_LIGHT_ID) > 0 || getActiveSkillCount(source, JUEYING_RETIRE_ID) > 0;
  const rules = [
    { skillId: "1041", name: "破地之力", enabled: !hasLingtaField(state, sourceId) && !ignoresWujinFields && !stats.ignoreEarthBreak && powerComparedTo(2) >= 0 && powerComparedTo(6) <= 0 },
    { skillId: SUNSHINE_SKILL_ID, name: "阳光普照", enabled: !ignoresLightFields && powerComparedTo(4) > 0 },
    { skillId: ETERNAL_NIGHT_SKILL_ID, name: "永远之夜", enabled: !ignoresLightFields && powerComparedTo(4) < 0 }
  ];
  for (const rule of rules) if (rule.enabled && !skippedSkills?.has(rule.skillId)) {
    const owners = players.filter((player) => player.status === "alive" && appliesToPair(player, rule.skillId) && getActiveSkillCount(player, rule.skillId) > 0 &&
      (rule.skillId !== "1041" || (powerComparedTo(2) > 0 && powerComparedTo(6) < 0) ||
        getFusionEnhancementCount(player, rule.skillId, ["山河破碎"]) > 0) &&
      (!["1042", "1043"].includes(rule.skillId) ||
        getActiveSkillCount(player, rule.skillId) > getFusionEnhancementCount(player, rule.skillId, ["阳光之夜"]) || player.id === sourceId || player.id === targetId));
    if (owners.length) return { ...rule, ownerIds: owners.map((player) => player.id) };
  }
  return undefined;
}
