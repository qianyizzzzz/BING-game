import type { AttackStats, BuffState, GameState, PlayerState } from "../types";
import { attackPowerValue, combatValue, projectCombatValue, scaleCombatValue, withAttackPower } from "./combatValues";
import { INVENTORY_ITEM_STATE_TYPE } from "./effectCategories";
import { MOON_CHANT_STATE, MOON_PRAISE_STATE, MOON_RITUAL_ID } from "./moonIds";
import { isSkillIgnored } from "./skillIgnore";
import { getPeriodicUses } from "./limitedUseBalance";

export const MOON_ITEM = "summoned_moon";
export const MOON_RITUAL_COOLDOWN = "moon_ritual_cooldown";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// NASA's phase catalog gives this reference new moon and the mean synodic month.
// https://eclipse.gsfc.nasa.gov/phase/phases1901.html
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_MS = 29.530588 * DAY_MS;
const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

/** Mean-phase approximation for a Beijing horizon, independent of the room's solar time override. */
export function isNaturalMoonAboveHorizon(at = Date.now()): boolean {
  const phase = modulo(at - REFERENCE_NEW_MOON, SYNODIC_MONTH_MS) / SYNODIC_MONTH_MS;
  const beijingHour = modulo(at + 8 * HOUR_MS, DAY_MS) / HOUR_MS;
  const moonrise = 6 + 24 * phase;
  return modulo(beijingHour - moonrise, 24) < 12;
}

type MoonState = Pick<GameState, "roundNumber">;
type MoonHolder = Pick<PlayerState, "buffs">;

export function hasSummonedMoon(state: MoonState, player?: MoonHolder): boolean {
  return Boolean(player?.buffs.some((buff) => buff.itemKind === MOON_ITEM && buff.stacks > 0 &&
    (buff.expiresAtRound ?? 0) > state.roundNumber));
}

export function hasMoon(state: MoonState, player?: MoonHolder, at = Date.now()): boolean {
  return hasSummonedMoon(state, player) || isNaturalMoonAboveHorizon(at);
}

export function canSummonMoon(state: MoonState, player: MoonHolder, ignoreBalance = false): boolean {
  return (ignoreBalance || getPeriodicUses(player, MOON_RITUAL_ID, state.roundNumber, 1) > 0) &&
    !hasSummonedMoon(state, player) && !player.buffs.some((buff) =>
    buff.id === MOON_RITUAL_COOLDOWN && (buff.expiresAtRound ?? 0) > state.roundNumber);
}

export function summonMoon(state: MoonState, player: PlayerState): boolean {
  if (!canSummonMoon(state, player)) return false;
  player.buffs.push({ id: MOON_ITEM, stateType: INVENTORY_ITEM_STATE_TYPE, itemKind: MOON_ITEM,
    name: "月亮", stacks: 1, sourceAbilityId: MOON_RITUAL_ID, expiresAtRound: state.roundNumber + 3 },
  { id: MOON_RITUAL_COOLDOWN, name: "月祭冷却", stacks: 1, expiresAtRound: state.roundNumber + 1 });
  return true;
}

export function moonBuffActive(buff: BuffState, roundNumber: number): boolean {
  return (buff.startsAtRound ?? 0) <= roundNumber && (buff.expiresAtRound ?? 0) > roundNumber;
}

export function moonCakeGainMultiplier(player: MoonHolder, roundNumber: number): number {
  return 2 ** player.buffs.filter((buff) => buff.stateType === MOON_CHANT_STATE && moonBuffActive(buff, roundNumber)).length;
}

export function applyMoonPraiseAttack(player: PlayerState | undefined, stats: AttackStats, roundNumber: number): AttackStats {
  if (!player || stats.fixedPointPower || stats.nonAttackMove || stats.id === "1035") return stats;
  const count = player.buffs.filter((buff) => buff.stateType === MOON_PRAISE_STATE && moonBuffActive(buff, roundNumber) &&
    (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId))).length;
  if (!count) return stats;
  const factor = 3 ** count;
  const result = withAttackPower(stats, scaleCombatValue(attackPowerValue(stats), factor));
  const parts = stats.damagePartValues ?? stats.damageParts?.map(combatValue);
  if (parts) {
    result.damagePartValues = parts.map((power) => scaleCombatValue(power, factor));
    result.damageParts = result.damagePartValues.map(projectCombatValue);
  }
  return result;
}
