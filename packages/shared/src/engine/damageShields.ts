import type { BuffState, PlayerState } from "../types";
import { addCombatValues, compareCombatValues, scaleCombatValue, type CombatValue } from "./combatValues";
import { isThornSkillDisabled, SHIELD_STATE_TYPE } from "./effectCategories";
import { isSkillIgnored } from "./skillIgnore";

export function getDamageShieldValue(player: Pick<PlayerState, "buffs">): CombatValue {
  return player.buffs.reduce<CombatValue>((total, buff) => buff.stateType === SHIELD_STATE_TYPE && buff.damageShieldLimit
    ? addCombatValues(total, scaleCombatValue(buff.damageShieldLimit, buff.stacks)) : total, []);
}

/** Spend the smallest eligible shield to leave stronger shields for later packets. */
export function consumeDamageShield(player: PlayerState, damage: CombatValue, suppressed?: (buff: BuffState) => boolean): BuffState | undefined {
  const shield = player.buffs.filter((buff) => buff.stateType === SHIELD_STATE_TYPE && buff.stacks > 0 &&
    !suppressed?.(buff) &&
    (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId) && !isThornSkillDisabled(player, buff.sourceAbilityId)) &&
    buff.damageShieldLimit && compareCombatValues(damage, buff.damageShieldLimit) <= 0)
    .sort((a, b) => compareCombatValues(a.damageShieldLimit!, b.damageShieldLimit!))[0];
  if (!shield) return undefined;
  shield.stacks -= 1;
  if (shield.stacks === 0) player.buffs = player.buffs.filter((buff) => buff !== shield);
  return shield;
}
