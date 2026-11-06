import {
  EXPLODE_EFFECT_POWER, EXECUTE_EFFECT_POWER, INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER
} from "../types";
import type { AttackStats, DefeatLevel } from "../types";

/** A finite sum of real multiples of powers of x, in descending exponent order. */
export type CombatValue = ReadonlyArray<Readonly<{ exponent: number; coefficient: number }>>;

export function combatValue(coefficient: number, exponent = 0): CombatValue {
  return coefficient === 0 ? [] : [{ coefficient, exponent }];
}

export const INFINITY_VALUE = combatValue(1, 1);
export const RETIRE_VALUE = combatValue(1, 1.9);

const legacyDefeatValues = [
  { code: RETIRE_EFFECT_POWER, value: RETIRE_VALUE, level: 2, trait: "defeat_retire" },
  { code: VANISH_EFFECT_POWER, value: combatValue(1, 2.9), level: 3, trait: "defeat_vanish" },
  { code: EXECUTE_EFFECT_POWER, value: combatValue(1, 3.9), level: 4, trait: "defeat_execute" },
  { code: EXPLODE_EFFECT_POWER, value: combatValue(1, 4.9), level: 5, trait: "defeat_explode" }
] as const;

function normalize(terms: CombatValue): CombatValue {
  const combined = new Map<number, number>();
  for (const { exponent, coefficient } of terms) {
    // Decimal exponents such as 1.9 must cancel after multiplication and division.
    const key = Number(exponent.toFixed(9));
    combined.set(key, (combined.get(key) ?? 0) + coefficient);
  }
  return [...combined.entries()].filter(([, coefficient]) => coefficient !== 0)
    .sort(([a], [b]) => b - a).map(([exponent, coefficient]) => ({ exponent, coefficient }));
}

export function addCombatValues(a: CombatValue, b: CombatValue): CombatValue {
  return normalize([...a, ...b]);
}

export function scaleCombatValue(value: CombatValue, factor: number): CombatValue {
  if (factor === 0) return [];
  return value.map(({ exponent, coefficient }) => ({ exponent, coefficient: coefficient * factor }));
}

export function subtractCombatValues(a: CombatValue, b: CombatValue): CombatValue {
  return addCombatValues(a, scaleCombatValue(b, -1));
}

export function multiplyCombatValues(a: CombatValue, b: CombatValue): CombatValue {
  return normalize(a.flatMap(left => b.map(right => ({
    exponent: left.exponent + right.exponent, coefficient: left.coefficient * right.coefficient
  }))));
}

export function compareCombatValues(a: CombatValue, b: CombatValue): number {
  return Math.sign(subtractCombatValues(a, b)[0]?.coefficient ?? 0);
}

export function isUnboundedCombatValue(value: CombatValue): boolean {
  return (value[0]?.exponent ?? 0) > 0;
}

export function roundCombatValue(value: CombatValue, round: (amount: number) => number): CombatValue {
  const finite = value.find(term => term.exponent === 0)?.coefficient ?? 0;
  return addCombatValues(value.filter(term => term.exponent > 0), combatValue(round(finite)));
}

/** Damage uses the leading quotient. A vanishing quotient deals zero and can still hit. */
export function divideCombatDamage(numerator: CombatValue, denominator: CombatValue): CombatValue {
  const top = numerator[0], bottom = denominator[0];
  if (!bottom) throw new RangeError("伤害分母不能为零");
  if (!top || top.exponent < bottom.exponent) return [];
  return normalize(combatValue(top.coefficient / bottom.coefficient, top.exponent - bottom.exponent));
}

/** Read the old sentinel fields when opening an old state or consuming an old attack definition. */
export function fromLegacyCombatStat(value: number): CombatValue {
  const magnitude = Math.abs(value);
  const special = magnitude === INFINITE_DAMAGE ? INFINITY_VALUE :
    legacyDefeatValues.find(({ code }) => code === magnitude)?.value;
  return special ? scaleCombatValue(special, Math.sign(value)) : combatValue(value);
}

/** Keep numeric fields usable by older clients and finite-only counters. */
export function projectCombatValue(value: CombatValue): number {
  if (!isUnboundedCombatValue(value)) return value.find(term => term.exponent === 0)?.coefficient ?? 0;
  const sign = Math.sign(value[0]!.coefficient);
  const magnitude = scaleCombatValue(value, sign);
  return sign * (legacyDefeatValues.find(rank => compareCombatValues(rank.value, magnitude) === 0)?.code ?? INFINITE_DAMAGE);
}

export function attackPowerValue(stats: Pick<AttackStats, "power" | "powerValue">): CombatValue {
  return stats.powerValue ?? fromLegacyCombatStat(stats.power);
}

export function attackLevelValue(stats: Pick<AttackStats, "level" | "levelValue">): CombatValue {
  return stats.levelValue ?? fromLegacyCombatStat(stats.level);
}

export function withAttackPower(stats: AttackStats, value: CombatValue): AttackStats {
  return { ...stats, power: projectCombatValue(value), powerValue: value };
}

export function withAttackLevel(stats: AttackStats, value: CombatValue): AttackStats {
  return { ...stats, level: projectCombatValue(value), levelValue: value };
}

export function offsetAttackStats(stats: AttackStats, power: number, level: number): AttackStats {
  const attack = power ? withAttackPower(stats, addCombatValues(attackPowerValue(stats), combatValue(power))) : stats;
  return level ? withAttackLevel(attack, addCombatValues(attackLevelValue(attack), combatValue(level))) : attack;
}

export function getPointDamageDefeatLevel(stats: AttackStats | undefined): DefeatLevel | undefined {
  if (!stats) return undefined;
  return [...legacyDefeatValues].reverse().find(rank => stats.traits.includes(rank.trait))?.level ??
    (stats.powerValue === undefined ? legacyDefeatValues.find(rank => rank.code === stats.power)?.level : undefined);
}

export function getPointDamageTrait(value: CombatValue): AttackStats["traits"][number] | undefined {
  return legacyDefeatValues.find(rank => compareCombatValues(rank.value, value) === 0)?.trait;
}

export function calculateClashValue(high: AttackStats, low: AttackStats, power: CombatValue, roundFinite = false): CombatValue {
  if (getPointDamageDefeatLevel(high)) return power;
  const highLevel = attackLevelValue(high), lowLevel = attackLevelValue(low);
  if (compareCombatValues(highLevel, []) <= 0) return power;
  const quotient = divideCombatDamage(multiplyCombatValues(power, subtractCombatValues(highLevel, lowLevel)), highLevel);
  return roundFinite && ![power, highLevel, lowLevel].some(isUnboundedCombatValue)
    ? combatValue(Math.ceil(projectCombatValue(quotient))) : quotient;
}

export function formatCombatValue(value: CombatValue): string {
  if (!value.length) return "0";
  return value.map(({ exponent, coefficient }, index) => {
    const sign = coefficient < 0 ? "−" : index > 0 ? "+" : "";
    const magnitude = Math.abs(coefficient);
    if (exponent === 0) return sign + String(magnitude);
    return sign + (magnitude === 1 ? "" : String(magnitude)) + "∞" + (exponent === 1 ? "" : "^" + exponent);
  }).join("");
}
