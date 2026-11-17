import type { PlayerState, StoredDamage } from "../types";

export const STORED_DAMAGE_STATUS = "juneng_stored_damage";

export function getStoredDamages(player?: Pick<PlayerState, "buffs" | "storedDamages">): readonly StoredDamage[] {
  return player?.buffs.find(({ id }) => id === STORED_DAMAGE_STATUS)?.storedDamages ?? player?.storedDamages ?? [];
}

export function setStoredDamages(player: PlayerState, damages: StoredDamage[]): void {
  delete player.storedDamages;
  if (!damages.length) {
    player.buffs = player.buffs.filter(({ id }) => id !== STORED_DAMAGE_STATUS);
    return;
  }
  const status = player.buffs.find(({ id }) => id === STORED_DAMAGE_STATUS);
  if (status) {
    status.stacks = damages.length;
    status.storedDamages = damages;
  } else {
    player.buffs.push({ id: STORED_DAMAGE_STATUS, name: "储存伤害", stacks: damages.length, storedDamages: damages });
  }
}

/** Route old game states and snapshots through the same status removal rules. */
export function migrateStoredDamages(player: PlayerState): void {
  if (player.storedDamages) setStoredDamages(player, [...getStoredDamages(player)]);
}
