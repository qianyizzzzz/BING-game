import type { AttackStats, GameState, PlayerState } from "../types";
import { bigCardHasAbility, XIELING_AMBUSH_ID, XIELING_BODY_ID, XIELING_ELEMENT, XIELING_INHERIT_ID,
  XIELING_INVASION_ID, XIELING_ULTIMATE_ID } from "../bigCards/abilities";
import { getFusionRecipe, isFusionActive } from "../skills/fusion";
import { getActiveSkillCount } from "./gameFactory";
import { CORRUPTION_CARD_ID, CORRUPTION_DOMAIN_ID } from "./corruptionIds";
import { addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues, fromLegacyCombatStat,
  getPointDamageDefeatLevel, INFINITY_VALUE, isUnboundedCombatValue, projectCombatValue, RETIRE_VALUE, roundCombatValue,
  scaleCombatValue, withAttackLevel, withAttackPower, type CombatValue } from "./combatValues";
import { EXECUTE_EFFECT_POWER } from "../types";
import { getElementAmount } from "./elementResources";
import { getPeriodicUses, invertPeriodicUses } from "./limitedUseBalance";
import { canGainStatus } from "./karmaSong";

export const XIELING_MARK = "xieling_mark";
export const XIELING_BODY_STATE = "xieling_body";
export const XIELING_REFLECT_STATE = "xieling_negative_reflect";
export const XIELING_END_DRAIN = "xieling_end_drain";
export const XIELING_COOLDOWN = 50;
export const XIEYU_SKILL_ID = "1071";

export function getXielingMarkValue(player: Pick<PlayerState, "buffs"> | undefined): CombatValue {
  const buff = player?.buffs.find(({ id }) => id === XIELING_MARK);
  return buff?.xielingMarkValue ?? combatValue(buff?.stacks ?? 0);
}

export function getSpendableXielingMarks(player: Pick<PlayerState, "buffs"> | undefined): number {
  const value = getXielingMarkValue(player);
  return isUnboundedCombatValue(value) ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.floor(projectCombatValue(value)));
}

export function changeXielingMarks(player: PlayerState, amount: CombatValue): void {
  if (compareCombatValues(amount, []) > 0 && !canGainStatus(player)) return;
  const next = addCombatValues(getXielingMarkValue(player), amount);
  player.buffs = player.buffs.filter(({ id }) => id !== XIELING_MARK);
  if (compareCombatValues(next, []) > 0) player.buffs.push({ id: XIELING_MARK, name: "邪灵印记",
    stacks: isUnboundedCombatValue(next) ? projectCombatValue(next) : Math.ceil(projectCombatValue(next)),
    xielingMarkValue: next, infinite: isUnboundedCombatValue(next) });
}

export function getXielingConversionLimit(player: Pick<PlayerState, "buffs"> | undefined): number {
  return Math.min(getSpendableXielingMarks(player), Number.MAX_SAFE_INTEGER - getElementAmount(player, XIELING_ELEMENT));
}

function xielingBodies(player: Pick<PlayerState, "buffs"> | undefined, round: number) {
  return player?.buffs.filter((buff) => buff.stateType === XIELING_BODY_STATE && (buff.startsAtRound ?? 0) <= round &&
    (buff.expiresAtRound ?? 0) > round) ?? [];
}

export function hasXielingBody(player: Pick<PlayerState, "buffs"> | undefined, round: number): boolean {
  return xielingBodies(player, round).length > 0;
}

function xielingInheritances(player: PlayerState) {
  return (player.bigCards ?? []).filter((card) => !card.junengDisabled && bigCardHasAbility(card, XIELING_INHERIT_ID))
    .sort((a, b) => (a.acquisitionOrder ?? 0) - (b.acquisitionOrder ?? 0)).slice(0, getActiveSkillCount(player, XIELING_INHERIT_ID));
}

interface XieyuQuota {
  key: string;
  period: number;
  quantity: number;
  sourceId?: string;
}

function getDueXieyuQuotas(player: PlayerState, round: number): XieyuQuota[] {
  const total = getActiveSkillCount(player, XIEYU_SKILL_ID);
  if (!total) return [];

  const corruptionCards = (player.bigCards ?? []).filter((card) => card.cardId === CORRUPTION_CARD_ID);
  const grantedByCorruption = (player.skillInventory ?? []).flatMap((item) => {
    if (item.skillId !== XIEYU_SKILL_ID || !item.sourceBigCardInstanceId) return [];
    const card = corruptionCards.find(({ instanceId }) => instanceId === item.sourceBigCardInstanceId);
    // The active count already excludes grants paused with their parent card or ability.
    if (!card || card.junengDisabled || card.temporarilyLostAbilityIds?.includes(CORRUPTION_DOMAIN_ID)) return [];
    const coveringFusion = player.skillFusions?.find((fusion) => fusion.materialInstanceIds?.includes(item.instanceId));
    if (coveringFusion && (!getFusionRecipe(coveringFusion.skillId)?.retainedMaterialIds.includes(XIEYU_SKILL_ID) ||
      !isFusionActive(player, coveringFusion))) return [];
    return [card];
  }).slice(0, total);
  const corruption: XieyuQuota[] = grantedByCorruption.filter((card) => bigCardHasAbility(card, CORRUPTION_DOMAIN_ID))
    .slice(0, getActiveSkillCount(player, CORRUPTION_DOMAIN_ID))
    .map(({ instanceId }) => ({ key: `${XIEYU_SKILL_ID}:${instanceId}`, period: 1, quantity: 1, sourceId: instanceId }));
  const remaining = total - grantedByCorruption.length;
  if (!remaining) return corruption;
  if (hasXielingBody(player, round)) return [...corruption, { key: `${XIEYU_SKILL_ID}:1`, period: 1, quantity: remaining }];

  const inherited = new Set(xielingInheritances(player).map(({ instanceId }) => instanceId));
  const upgraded = Math.min(remaining, (player.skillInventory ?? []).filter((item) =>
    item.skillId === XIEYU_SKILL_ID && inherited.has(item.sourceBigCardInstanceId ?? "")).length);
  if (upgraded && round % 2 === 0) corruption.push({ key: `${XIEYU_SKILL_ID}:2`, period: 2, quantity: upgraded });
  if (remaining > upgraded && round % 3 === 0)
    corruption.push({ key: `${XIEYU_SKILL_ID}:3`, period: 3, quantity: remaining - upgraded });
  return corruption;
}

export function getDueXieyuSources(player: PlayerState, round: number): Array<string | undefined> {
  return getDueXieyuQuotas(player, round).flatMap(({ key, quantity, sourceId }) =>
    Array<string | undefined>(Math.max(0, getPeriodicUses(player, key, round, quantity))).fill(sourceId));
}

export function invertDueXieyuUses(player: PlayerState, round: number): void {
  for (const { key, period, quantity } of getDueXieyuQuotas(player, round))
    invertPeriodicUses(player, key, round, quantity, period, quantity);
}

export function getDueXieyuCount(player: PlayerState, round: number): number {
  return getDueXieyuSources(player, round).length;
}

export function getXieyuDrainValue(player: PlayerState, round: number): CombatValue {
  const modifiers = [
    ...xielingInheritances(player).map((card) => ({ order: card.acquisitionOrder ?? 0, add: true })),
    ...xielingBodies(player, round).map((body) => ({ order: player.bigCards?.find((card) =>
      card.instanceId === body.sourceBigCardInstanceId)?.acquisitionOrder ?? 0, add: false }))
  ].sort((a, b) => a.order - b.order || Number(b.add) - Number(a.add));
  const bonus = roundCombatValue(scaleCombatValue(getXielingMarkValue(player), 0.2), Math.floor);
  return modifiers.reduce((amount, modifier) => modifier.add ? addCombatValues(amount, bonus) : scaleCombatValue(amount, 2),
    combatValue(1));
}

export function isRoundIntervalDrain(state: Pick<GameState, "activeTimingPhase" | "roundEndDamagePending" | "damageModifyReturnPhase">): boolean {
  const phase = state.damageModifyReturnPhase ?? state.activeTimingPhase;
  return Boolean(state.roundEndDamagePending || phase === "round_end_check" ||
    phase === "round_after_interval_action" || phase === "round_pre_interval_action");
}

export function changeXielingCooldown(player: PlayerState, instanceId: string | undefined, amount: number): void {
  const cooldown = player.bigCards?.find((card) => card.instanceId === instanceId)?.xielingCooldown;
  if (cooldown) cooldown.remaining = Math.max(0, cooldown.remaining - amount);
}

export function tickXielingCooldowns(state: GameState): void {
  for (const player of state.players) {
    const speed = hasXielingBody(player, state.roundNumber) ? 3 : 1;
    for (const card of player.bigCards ?? []) {
      if (card.xielingCooldown && card.xielingCooldown.castTurn < state.turnNumber)
        changeXielingCooldown(player, card.instanceId, speed);
    }
  }
}

function setXielingAttackPower(stats: AttackStats, value: CombatValue, fixed = false): AttackStats {
  const traits = stats.traits.filter((trait) => !trait.startsWith("defeat_"));
  if (fixed) traits.push(compareCombatValues(value, RETIRE_VALUE) === 0 ? "defeat_retire" : "defeat_execute");
  const next = withAttackPower({ ...stats, traits, fixedPointPower: false }, value);
  delete next.damageParts;
  delete next.damagePartValues;
  return { ...next, fixedPointPower: fixed };
}

export function shapeXielingAttack(stats: AttackStats, body: boolean, threateningTarget: boolean,
  lastHit: boolean, roll: () => number = Math.random): AttackStats {
  const originalLevel = attackLevelValue(stats);
  let result = stats;
  if (stats.id === XIELING_INVASION_ID) result = { ...result, xielingDrainRate: 0.5 };
  if (stats.id === XIELING_AMBUSH_ID && lastHit) result = setXielingAttackPower(result, RETIRE_VALUE, true);
  const ultimate = stats.id === XIELING_ULTIMATE_ID;
  if (ultimate && threateningTarget) result = { ...setXielingAttackPower(result, INFINITY_VALUE), xielingDrainRate: 1 };
  const spells = ultimate ? [combatValue(10 * stats.stacks)] : [];
  if (!body) return spells.length ? { ...result, xielingSpellOnHit: spells } : result;

  if (ultimate) {
    const execute = roll() < 0.01;
    const promote = (value: CombatValue, factor: number) => compareCombatValues(value, INFINITY_VALUE) === 0 ?
      (execute ? fromLegacyCombatStat(EXECUTE_EFFECT_POWER) : RETIRE_VALUE) :
      compareCombatValues(value, combatValue(10)) === 0 ? INFINITY_VALUE : scaleCombatValue(value, factor);
    const power = attackPowerValue(result);
    if (!getPointDamageDefeatLevel(result)) {
      const nextPower = promote(power, 2);
      result = setXielingAttackPower(result, nextPower, compareCombatValues(power, INFINITY_VALUE) === 0);
    }
    result = withAttackLevel(result, promote(originalLevel, 4));
    spells[0] = promote(spells[0]!, 1);
  } else {
    const parts = result.damagePartValues ?? result.damageParts?.map((amount) => combatValue(amount));
    if (!getPointDamageDefeatLevel(result)) {
      result = withAttackPower(result, scaleCombatValue(attackPowerValue(result), 2));
      if (parts) result = { ...result, damagePartValues: parts.map((part) => scaleCombatValue(part, 2)) };
    }
    result = withAttackLevel(result, scaleCombatValue(originalLevel, 4));
  }
  return { ...result, xielingSpellOnHit: [...spells, originalLevel] };
}
