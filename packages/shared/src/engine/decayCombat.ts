import type { AttackStats, PlayerState } from "../types";
import { combatValue, withAttackPower } from "./combatValues";
import { ANNIHILATION_MARK, DECAY_EXTREME_ID, DECAY_INHERIT_ID, DECAY_MARKS_ID } from "./decayIds";
import { getDecayMarkCount } from "./decayHp";
import { getActiveSkillCount } from "./gameFactory";

export function shapeDecayAttack(player: PlayerState | undefined, stats: AttackStats): AttackStats {
  if (stats.nonAttackMove || !stats.isSkill) return stats;
  if (stats.id === DECAY_EXTREME_ID) stats = withAttackPower(stats, combatValue(1,
    getDecayMarkCount(player, ANNIHILATION_MARK) + getActiveSkillCount(player, DECAY_MARKS_ID)));
  return getActiveSkillCount(player, DECAY_INHERIT_ID) ? { ...stats, piercesDefenseMoves: true } : stats;
}
