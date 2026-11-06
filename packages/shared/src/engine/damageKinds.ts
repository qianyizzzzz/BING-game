import { PendingDamageItem } from "../types";
import { compareCombatValues, fromLegacyCombatStat, projectCombatValue } from "./combatValues";
import type { CombatValue } from "./combatValues";

/** Attack origin is independent of fire/ice/electric attributes and self-return backlash. */
export function isAttackDamageItem(item: Pick<PendingDamageItem, "fromAttack" | "spellDamage">): boolean {
  return Boolean(item.fromAttack && !item.spellDamage);
}

export function pendingDamageValue(item: Pick<PendingDamageItem, "amount" | "amountValue">): CombatValue {
  return item.amountValue ?? fromLegacyCombatStat(item.amount);
}

export function setPendingDamageValue(item: PendingDamageItem, value: CombatValue): void {
  item.amountValue = value;
  item.amount = projectCombatValue(value);
}

export function isDamageWithinLimit(item: PendingDamageItem, limit: CombatValue): boolean {
  return item.amount > 0 && !item.pointDefeatLevel && compareCombatValues(pendingDamageValue(item), limit) <= 0;
}
