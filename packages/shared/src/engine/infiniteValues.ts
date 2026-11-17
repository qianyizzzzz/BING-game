import type { PlayerState } from "../types";
import { addCombatValues, combatValue, compareCombatValues, formatCombatValue, INFINITY_VALUE,
  isUnboundedCombatValue, projectCombatValue, scaleCombatValue, subtractCombatValues } from "./combatValues";
import type { CombatValue } from "./combatValues";
import { hasKaigeHpLimit, KAIGE_HP_LIMIT } from "./kaige";
import { DECAY_FIELD_HP_LIMIT } from "./decayIds";

export function getPlayerHpValue(player: Pick<PlayerState, "hp" | "hpIsInfinite" | "hpValue">): CombatValue {
  return player.hpValue ?? (player.hpIsInfinite ? scaleCombatValue(INFINITY_VALUE, Math.sign(player.hp)) : combatValue(player.hp));
}

export function getPlayerHpCapValue(player: PlayerState): CombatValue | undefined {
  let cap = player.nightHpCap;
  const limits = [player.decayReducedHpCap, player.decayFieldHpCap ? combatValue(DECAY_FIELD_HP_LIMIT) : undefined,
    hasKaigeHpLimit(player) ? combatValue(KAIGE_HP_LIMIT) : undefined];
  for (const limit of limits) if (limit !== undefined && (cap === undefined || compareCombatValues(limit, cap) < 0)) cap = limit;
  return cap;
}

export function clampPlayerHpToCap(player: PlayerState): boolean {
  const cap = getPlayerHpCapValue(player);
  const hp = getPlayerHpValue(player);
  if (cap === undefined || compareCombatValues(hp, cap) <= 0) return false;
  setPlayerHpValue(player, hp);
  return true;
}

export function applyNightHpCap(player: PlayerState): void {
  player.nightHpCap ??= getPlayerHpValue(player);
}

export function clearNightHpCap(player: PlayerState): void {
  delete player.nightHpCap;
}

export function reduceNightHpCap(player: PlayerState, amount: CombatValue): void {
  if (!player.nightHpCap) return;
  const limit = subtractCombatValues(player.nightHpCap, amount);
  player.nightHpCap = limit;
  if (compareCombatValues(getPlayerHpValue(player), limit) > 0) setPlayerHpValue(player, limit);
}

export function canRecoverWithHpCap(player: PlayerState): boolean {
  const cap = getPlayerHpCapValue(player);
  return cap === undefined || compareCombatValues(cap, []) >= 0;
}

export function setPlayerHpValue(player: PlayerState, value: CombatValue): void {
  const cap = getPlayerHpCapValue(player);
  if (cap && compareCombatValues(value, cap) > 0) {
    if ((player.nightHpCap || player.decayReducedHpCap) && compareCombatValues(cap, []) === 0) player.hpCappedRecoveryAtZero = true;
    value = cap;
  }
  if (compareCombatValues(value, []) !== 0) delete player.hpCappedRecoveryAtZero;
  if (player.nightHpCap && compareCombatValues(value, player.nightHpCap) < 0)
    player.nightHpCap = value;
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
  setPlayerHpValue(player, addCombatValues(getPlayerHpAfterDamage(player, damageValue, zeroAt), healingValue));
}

export function getPlayerHpAfterDamage(player: PlayerState, damage: CombatValue, zeroAt?: CombatValue): CombatValue {
  if (zeroAt === undefined) return subtractCombatValues(getPlayerHpValue(player), damage);
  const loss = subtractCombatValues(damage, zeroAt);
  return compareCombatValues(loss, []) > 0 ? scaleCombatValue(loss, -1) : [];
}
