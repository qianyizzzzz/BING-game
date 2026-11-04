import { PendingDamageItem } from "../types";

/** Attack origin is independent of fire/ice/electric attributes and self-return backlash. */
export function isAttackDamageItem(item: Pick<PendingDamageItem, "fromAttack" | "spellDamage">): boolean {
  return Boolean(item.fromAttack && !item.spellDamage);
}
