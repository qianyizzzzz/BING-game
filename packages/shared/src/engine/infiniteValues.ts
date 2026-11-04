import { INFINITE_DAMAGE, PlayerState } from "../types";

/** Temporary rule confirmed by the developer: existing positive infinite HP survives infinite damage. */
export function applyHealthAmounts(player: PlayerState, damage: number, healing: number,
  infiniteDamage = false, infiniteHealing = false, damageAtZero?: number): void {
  if ((player.hpIsInfinite && player.hp > 0) || infiniteHealing) {
    player.hp = INFINITE_DAMAGE;
    player.hpIsInfinite = true;
  } else if (infiniteDamage) {
    player.hp = -INFINITE_DAMAGE;
    player.hpIsInfinite = true;
  } else {
    player.hp = (damageAtZero !== undefined ? -Math.max(0, damage - damageAtZero) : player.hp - damage) + healing;
  }
}
