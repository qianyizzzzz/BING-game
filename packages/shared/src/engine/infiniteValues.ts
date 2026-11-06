import type { PlayerState } from "../types";
import { addCombatValues, combatValue, compareCombatValues, formatCombatValue, INFINITY_VALUE,
  isUnboundedCombatValue, projectCombatValue, scaleCombatValue, subtractCombatValues } from "./combatValues";
import type { CombatValue } from "./combatValues";

export function getPlayerHpValue(player: Pick<PlayerState, "hp" | "hpIsInfinite" | "hpValue">): CombatValue {
  return player.hpValue ?? (player.hpIsInfinite ? scaleCombatValue(INFINITY_VALUE, Math.sign(player.hp)) : combatValue(player.hp));
}

export function setPlayerHpValue(player: PlayerState, value: CombatValue): void {
  player.hp = projectCombatValue(value);
  if (isUnboundedCombatValue(value)) {
    player.hpIsInfinite = true;
    player.hpValue = value;
  } else {
    delete player.hpIsInfinite;
    delete player.hpValue;
  }
}

export function formatPlayerHp(player: Pick<PlayerState, "hp" | "hpIsInfinite" | "hpValue">): string {
  return formatCombatValue(getPlayerHpValue(player));
}

export function applyHealthAmounts(player: PlayerState, damage: number, healing: number,
  infiniteDamage = false, infiniteHealing = false, damageAtZero?: number,
  exact?: { damage?: CombatValue; healing?: CombatValue; damageAtZero?: CombatValue }): void {
  const damageValue = exact?.damage ?? (infiniteDamage ? INFINITY_VALUE : combatValue(damage));
  const healingValue = exact?.healing ?? (infiniteHealing ? INFINITY_VALUE : combatValue(healing));
  const zeroAt = exact?.damageAtZero ?? (damageAtZero === undefined ? undefined : combatValue(damageAtZero));
  const loss = zeroAt === undefined ? damageValue : subtractCombatValues(damageValue, zeroAt);
  const next = zeroAt === undefined ? subtractCombatValues(getPlayerHpValue(player), loss) :
    compareCombatValues(loss, []) > 0 ? scaleCombatValue(loss, -1) : [];
  setPlayerHpValue(player, addCombatValues(next, healingValue));
}
